# AfroLitPlaylist

One Next.js application serving three audiences from one database and one codebase.

| Surface | Route group | Who |
| --- | --- | --- |
| Public site | `src/app/(public)` | readers |
| Admin CMS | `src/app/(admin)/admin` | admins and editors |
| Artist portal | `src/app/(portal)/portal` | artists |

There is **no separate API service**. Server Components read the database through
Prisma, writes go through Server Actions, and Route Handlers exist only where
something external must call in (auth, uploads, cron, feeds, the view beacon).

---

## Getting it running

```bash
cp .env.example .env          # DATABASE_URL, DIRECT_URL and AUTH_SECRET are required
npm install
npx prisma generate
npx prisma db push            # or: npx prisma migrate deploy
npm run db:seed
npm run dev
```

Then apply the search indexes once — full-text search errors without them:

```bash
psql "$DIRECT_URL" -f prisma/migrations/20260101000000_search_indexes/migration.sql
```

Seed creates an admin (`admin@afrolitplaylist.com` / `change-me-now`, override with
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`), the blog categories, and the
AfroQueens Camp series with one event so the nav dropdown has something to show.

**Everything optional degrades rather than breaks.** No Cloudinary keys → uploads
return "not configured". No Resend key → emails log to the console. No Upstash →
rate limits fall back to per-instance memory with a warning. You can run the whole
app with nothing but a database.

---

## The five things that explain most of the codebase

### 1. Authorisation is default-deny — `src/lib/rbac.ts`

Every admin and portal Server Action and Route Handler opens with a guard that
**throws**, never returns null, so a forgotten check fails closed.

```ts
await requireRole("ADMIN", "EDITOR")   // role from the JWT claim — routine work
await requireRoleFresh("ADMIN")        // role re-read from the DB — destructive work
await requireOwnArtist(artistId)       // ownership, not just role
```

`requireRoleFresh` exists because a JWT keeps its claims until it expires: a user
you demote or suspend would otherwise keep acting with their old role. It is used
for approve, reject, publish, delete, invite, send and settings.

> The bug this design prevents: writing an *authentication* check ("is someone
> logged in") where an *authorisation* check belongs, which lets any signed-in
> artist hand-craft a request to an admin endpoint.

Middleware (`middleware.ts`) only routes people to the right login screen. **It is
not authorisation** — a middleware match proves nothing about what a request may do.

### 2. Five templates, one codebase — `src/components/themes/`

Only five components may vary per theme: `Header`, `Hero`, `ArticleCard`,
`SectionHead`, `Footer`. Everything else — widgets, forms, tables, the entire
admin — is built once and themed with CSS variables.

```
themes/
  editorial/   full implementation (the base)
  centred/     overrides Header
  musicblog/   overrides Header, Hero
  darkroom/    overrides Header, Hero, ArticleCard
  street/      overrides Header, Hero, SectionHead
  registry.ts  theme key → component set, dynamically imported
```

Each theme spreads Editorial and replaces what differs, so adding a content type
means building it once, not five times. Themes are dynamically imported, so the
four unused ones stay out of the bundle. The active theme lives in `SiteSetting`
and is switched from `/admin/settings` — live, no redeploy.

### 3. One navigation set — `src/lib/nav.ts`

Themes differ in how they render the nav, never in what it contains. That is what
makes templates genuinely swappable without breaking links.

Any `EventSeries` flagged `showInNav` becomes a dropdown listing its upcoming
events. **Adding an AfroQueens Camp event needs no nav edit and no deploy.**

### 4. Posts are block JSON, never HTML

`Post.body` stores BlockNote block JSON. That single decision is why the same
content can feed the site, the RSS feed and the newsletter without a second
rendering path, and why custom music blocks are possible at all.

- Editor: `src/components/admin/BlockEditorClient.tsx`
- Renderer: `src/components/blocks/BlockRenderer.tsx`
- Music nodes: `src/components/blocks/MusicBlocks.tsx` — Audio Player, Release,
  Tracklist, Streaming Links, Artist mention

The renderer falls through to a paragraph for unknown block types and ignores
malformed props, so content written by a future editor version still reads.

### 5. Caching dictates where writes can happen

Public pages are statically generated and revalidated by tag. **A cached page runs
no server code when viewed**, which is why view counting cannot happen during
render. It goes through a client beacon instead:

`ViewBeacon` → `POST /api/views` → increments `Post.viewCount`

Admin and portal routes are `force-dynamic` and never cached.

---

## The artist review loop

The most intricate logic in the project. `src/lib/services/review.ts`.

```
submit           → PENDING, changes written to Artist.pendingProfile
request changes  → CHANGES_REQUESTED + reviewNote (note REQUIRED), email sent
resubmit         → the SAME blob is overwritten, status back to PENDING, note cleared
approve          → whitelisted fields merge into the live row, blob cleared
reject           → REJECTED, blob kept for reference
```

**One open review per artist.** `pendingProfile` is live working state, not a
queue. Because it is overwritten on every resubmission it keeps no history — so
every decision also appends an `ArtistReviewEvent`, and *that* append-only log is
what the review screen's history panel reads.

Approve merges only whitelisted fields rather than spreading the blob, so a
crafted payload cannot write `status` or `userId`.

**Discography bypasses this entirely** and publishes immediately. That is a
deliberate trade for artist speed; the safety valve is an admin unpublish on any
release, not full review gating.

The "note required to request changes" rule lives in the Zod schema, not just the
form, so it holds even if the UI is bypassed.

---

## Data model notes

Full schema: `prisma/schema.prisma`. The parts that aren't obvious:

| Decision | Why |
| --- | --- |
| `Artist.userId` is nullable | admin can create a profile shell before anyone claims it |
| `pendingProfile` is one JSON blob | the loop allows exactly one open review; a table would imply a queue |
| `ArtistReviewEvent` is append-only | the blob keeps no history, and the review screen needs one |
| `PostRevision` snapshots on publish | full version history is far more engineering than v1 needs |
| `EventSeries` with `showInNav` | nav dropdowns populate from data, not from code |
| `Track` is separate from `Discography` | tracklists need per-track rows; retrofitting later means a migration |
| `EmailTemplate` has no rows by default | built-in copy is the fallback, so a missing template can never block a send |
| Invites store `tokenHash`, never the token | a database leak cannot be replayed into account takeovers |

---

## Security posture

- **Default-deny authorisation** on every admin and portal write (above).
- **Ownership checks** on artist writes — a posted `artistId` is never trusted; the
  row's own owner is re-read before writing.
- **Zod validation** on every action input.
- **Signed direct uploads** (`/api/uploads/sign`) — files go browser → Cloudinary,
  never through the server. MIME type and size are validated server-side, audio is
  editor-only, and **the folder is chosen by the server from the session**, so an
  artist cannot write outside their own area.
- **Rate limiting** (`src/lib/rate-limit.ts`) on comments, signups, contact and
  registrations. Redis-backed via Upstash so limits are shared across instances;
  an in-memory Map resets per instance and is a speed bump, not protection.
- **Honeypot fields** on every public form. A filled honeypot returns *success* so
  bots learn nothing.
- **Enumeration resistance** — login errors never distinguish "no such user" from
  "wrong password", and newsletter signup returns the same message whether or not
  the address is already subscribed.
- **Cron endpoints** authenticate with a Bearer secret and fail closed if
  `CRON_SECRET` is unset.
- **Capacity enforced inside a transaction** — counting first and inserting after
  lets two simultaneous requests both pass the check and oversell a room.
- **The last admin cannot be demoted or suspended**, and nobody can change their
  own access, which would otherwise lock everyone out of settings.

---

## Background jobs — `vercel.json`

| Path | Schedule | Does |
| --- | --- | --- |
| `/api/cron/publish` | daily, 08:00 UTC | flips SCHEDULED → PUBLISHED |
| `/api/cron/newsletter` | daily, 09:00 UTC | sends due campaigns in batches |
| `/api/cron/keepalive` | daily, 12:00 UTC | `SELECT 1` while the app is deployed |

Hobby only accepts a cron that runs once a day. While the Node server is running, the app also pings Neon every 15 minutes. Neon free still suspends after 5 minutes of quiet, so the database sleeps between those pings.

Serverless has no long-running timer waiting to publish at 10am, so scheduling
only works because `publish` polls. The newsletter job marks a campaign `SENDING`
**before** any mail goes out, so a retried invocation cannot double-send.

---

## Search

`src/lib/search.ts`. `contains` compiles to `ILIKE '%term%'`, which cannot use an
index and scans every row. Replaced with Postgres full-text:

- GIN indexes over `to_tsvector` (in the migration)
- queried with `websearch_to_tsquery`, which accepts what people actually type
  (quoted phrases, `OR`, leading `-`) without throwing on syntax
- ranked with `ts_rank`, so the best match leads rather than the newest
- stems, so "touring" matches "tour"
- a trigram index as fallback for short partial names

---

## UI kit

| Component | Use |
| --- | --- |
| `ToastProvider` / `useActionToast` | action confirmations, `aria-live="polite"` |
| `RowSkeleton` | **tables and list rows** |
| `GridSkeleton` / `CardSkeleton` | card grids |
| `WidgetSkeleton` | sidebar widgets |
| `EmptyState` | genuinely empty results |
| `Pagination` | windowed page links, preserves filters |
| `UploadField` | signed direct-to-Cloudinary upload |

**Skeletons and empty states are deliberately different things.** A skeleton means
"loading"; an empty state means "there is nothing here". We never render fake
placeholder content as a fallback — that is how a site ships showing
"Artist One — Album Title".

---

## Importing the old WordPress site

```bash
npm run import:wp -- --source https://www.afrolitplaylist.com --dry --limit 5
```

Dry-run first; it writes nothing. The script preserves **original slugs** (so
existing links and backlinks keep working) and **original publish dates** (so the
archive stays in order), converts HTML to block JSON, and is idempotent — matched
slugs update instead of duplicating, so you can import, check, fix and re-run.

Re-creating posts by hand loses the slugs, which is the expensive part.

---

## Conventions

- Prices, totals and counts are recomputed server-side. Client input is never trusted.
- Every grid child carries `min-width: 0` (see `globals.css`) — a grid child's
  default `auto` minimum lets wide content force a column past the viewport.
- Red (`--primary`) is the only accent. It marks actions, active nav and category
  labels, nothing else. Flat surfaces: no shadows, no glassmorphism.
- Appearance (light/dark) is unrelated to the five layout templates.
- Emails send *after* the thing they describe has committed. A failed send must
  never roll back an approval that already happened.

---

## Known gaps

Honest list, in the order I would address them:

1. **No tests.** The review loop and `requireRole` are where a regression is
   expensive. Type-checking is not verification.
2. **No migration baseline.** The search indexes are the only migration file;
   the schema is otherwise applied with `db push`. Generate a baseline before
   real content exists.
3. **Post revisions are write-only** — snapshots accumulate with no UI to view
   or restore them.
4. **Embeddable widgets** from the original brief are not built.
5. **GA4** is not wired; `/admin/analytics` reads our own `PageView` rows.
6. **No accessibility audit.** Care has been taken (labels, `aria-live`, focus
   handling, reduced-motion) but nothing has been verified with a screen reader.
7. **Event ticket payments** are deliberately deferred. `registrationUrl` links
   out; free registration is handled in-app. Taking money needs the
   merchant-of-record question answered first.
