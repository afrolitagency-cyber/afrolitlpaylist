# Phase 1 — Ticketing and gate tracker

**Standalone.** Everything needed to sell tickets and run a door. Nothing here
depends on Phase 2. Do not read `PHASE-2` while building this.

## Where this stands (18 Nov 2026)

Selling is built: tier admin, checkout holds, Paystack initialize, verify-on-return, the signed `charge.success` webhook, the order page, QR email, the payments list and CSV, and door scan (camera, lookup, atomic check-in).

**Hold release is in.** An unpaid order keeps its tickets for 15 minutes (`HOLD_MS`). `releaseExpiredHolds` in `src/lib/holds.ts` then marks it `EXPIRED` and subtracts the quantity from `Event.ticketsHeld` and `TicketTier.held`. That runs when checkout loads, when a new checkout starts, when the event editor opens, and once a day inside `GET /api/cron/publish` (08:00 UTC). There is no `/api/cron/release-holds` and no 5-minute job, so Neon is not woken just to expire holds. The claim only succeeds while the order is still `PENDING`, so a payment landing in the same moment keeps the tickets.

One email has one open hold per event. The new checkout takes an advisory lock and releases that buyer's earlier unpaid hold in the same transaction. Checkout starts are capped at 5 per email and 8 per address each hour. If Paystack confirms after the 15 minutes and the tickets are still free, `fulfillPaidOrder` issues them. If they are gone, the order stays visible in payments with `refundNote` set, and the order page tells the buyer to email for a refund.

**Still left. Do not build these until the Paystack business is activated and the live secret key is in:**

1. Refunds: Paystack refund API, set the order to `REFUNDED`, set `voidedAt` on the tickets, decrement `sold`. The door already refuses a voided ticket. Nothing sets that yet.
2. Complimentary tickets from admin. `isComp` exists. There is no issue-tickets action.
3. Settlement screen: gross − fees − refunds, host share from `hostShareBps`, mark `settledAt`.
4. Public `/refunds` page. Ticket emails and the receipt already link to `afrolitplaylist.com/refunds`. The page does not exist.
5. Scan-rate chart, and an offline queue for when the venue network drops. The desk fails loudly today.

**Before the first real sale, outside the code:**

- Paystack starts every new business in test mode. The test secret key works immediately and moves no real money. The live secret key and the Live switch appear only after compliance is approved and the business is activated. Until then Paystack reports that payments are disabled for the business. Test and live dashboards are separate.
- Register the webhook URL on the Paystack dashboard. The route is already `src/app/api/webhooks/paystack/route.ts`. A test key confirms test charges. A live key confirms real ones. Paystack cannot call localhost.
- Decide whether the Paystack fee is added on top of the ticket price or taken out of it, before prices are published.
- Write the refund and cancellation policy, and show it at checkout. The link is already in the email and the receipt.
- For an on-behalf-of event, agree the host share and when it is paid, in writing, and store that in `settlementNote`.

Not in Phase 1: promoter logins, split subaccounts, Stripe, seat maps, resale.

---

## Scope

**Events are created by an editor in the admin**, exactly as they are today. An
event may be AfroLitPlaylist's own, or it may be **presented on behalf of an
artist or a promoter** — the editor still creates it, and tickets still sell
through AfroLitPlaylist's Paystack account.

That "on behalf of" case is the one to be clear about, because it changes who
owes whom:

| | Our own event | On behalf of an artist/promoter |
| --- | --- | --- |
| Who creates it | editor | editor |
| Whose Paystack | AfroLitPlaylist | AfroLitPlaylist |
| Who the page credits | AfroLitPlaylist | "Presented by …" |
| Who refunds the buyer | us | **us** |
| Who gets paid after | n/a | them, by bank transfer, after the show |

**You are the merchant either way.** If a show you sold tickets for is
cancelled, you refund the buyers from your account and then recover it from the
promoter — not the other way round. That is tolerable here because *you* chose
the event and you know the person; it is not the same as strangers signing up to
sell through you, which is Phase 2's problem and why Phase 2 keeps money out of
it.

Two practical consequences, both cheap:

- **Only take on events you would stand behind.** The protection in Phase 1 is
  editorial judgement, not code.
- **Hold the payout until after the event.** Settle 24–72 hours after it ends.
  Paying a promoter before the doors open means funding refunds yourself.

### Not in Phase 1

No promoter logins, no submission form, no review queue, no split payments, no
subaccounts, no Stripe, no multi-currency, no seat maps, no resale or transfers.

---

## 1. Data model

Additive. The only changes to `Event` are new fields.

> The live schema has moved past the copy I have (`type`, `city`, `ageLimit`,
> `schedule` are on the admin screen but not in my snapshot). Confirm names
> against the live `schema.prisma` before writing the migration.

### On `Event`

```prisma
  // --- how this event sells ---
  currency   String  @default("NGN")   // room for USD/GHS later; unused in Phase 1

  // --- presented on behalf of someone ---
  /// Display name, e.g. "Palmwine Records". Null = our own event.
  presentedBy        String?
  /// If the host is an artist already in the system, link it so the event
  /// shows on their profile. Independent of `lineup`.
  presentedByArtistId String?
  presentedByArtist   Artist? @relation("EventHost", fields: [presentedByArtistId], references: [id], onDelete: SetNull)
  hostContact        String?           // email/phone for settlement
  /// Their cut, in basis points. 7000 = 70%. 0 = ours entirely.
  hostShareBps       Int     @default(0)
  settlementNote     String? @db.Text  // the agreed deal, in words
  settledAt          DateTime?

  ticketTiers TicketTier[]
  orders      Order[]
  tickets     Ticket[]
```

Deliberately **not** a `Promoter` model. Phase 1 hosts are people you already
know and type in by hand; a model with logins and KYC belongs in Phase 2, and a
text field migrates into a relation easily when that day comes.

### New models

```prisma
enum OrderStatus {
  PENDING    // checkout started, inventory held
  PAID
  FAILED
  REFUNDED
  EXPIRED    // hold timed out, inventory released
}

model TicketTier {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  name        String   // "Super Early Bird", "Regular", "VIP", "Media"
  description String?
  priceKobo   Int      // minor units ALWAYS. Never a float for money.

  allocation  Int
  sold        Int      @default(0)
  held        Int      @default(0)   // in-flight checkouts — section 3

  /// Phased pricing. Early Bird closes, Regular opens, without anyone editing.
  salesStartsAt DateTime?
  salesEndsAt   DateTime?

  maxPerOrder Int      @default(10)
  /// Comps for artist management, sponsors, media. Never purchasable; issued
  /// from admin. Counts against capacity so the door maths is right.
  isComp      Boolean  @default(false)
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)

  tickets     Ticket[]
  orderItems  OrderItem[]

  @@index([eventId, active])
}

model Order {
  id         String      @id @default(cuid())
  eventId    String
  event      Event       @relation(fields: [eventId], references: [id])

  buyerName  String
  buyerEmail String
  buyerPhone String?

  status     OrderStatus @default(PENDING)
  totalKobo  Int
  /// Paystack's actual fee, taken from the webhook payload — not estimated.
  /// Settlement is wrong without it.
  feesKobo   Int?
  currency   String      @default("NGN")

  /// Unique. This is the idempotency key for the webhook.
  reference  String      @unique      // ALP-<cuid>
  paidAt     DateTime?
  holdsUntil DateTime?                // PENDING expires here
  refundedAt DateTime?
  refundNote String?

  items      OrderItem[]
  tickets    Ticket[]
  createdAt  DateTime    @default(now())

  @@index([status, holdsUntil])
  @@index([eventId, status])
  @@index([buyerEmail])
}

model OrderItem {
  id       String     @id @default(cuid())
  orderId  String
  order    Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  tierId   String
  tier     TicketTier @relation(fields: [tierId], references: [id])
  quantity Int
  /// Price at purchase. Tier prices change; a receipt must not.
  unitKobo Int
}

model Ticket {
  id      String     @id @default(cuid())
  orderId String?    // null for a comp issued without a sale
  order   Order?     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  tierId  String
  tier    TicketTier @relation(fields: [tierId], references: [id])
  eventId String
  event   Event      @relation(fields: [eventId], references: [id])

  /// 128 bits of randomness, never sequential. This is the only thing between
  /// a stranger and free entry.
  code       String   @unique
  holderName String?  // defaults to the buyer

  usedAt   DateTime?  // null = unused. A timestamp, not a boolean — section 6.
  usedBy   String?    // staff account that scanned it
  voidedAt DateTime?  // refunded or cancelled — must fail at the gate
  issuedBy String?    // admin user, for comps

  createdAt DateTime @default(now())

  @@index([eventId, usedAt])
  @@index([eventId, voidedAt])
}
```

### Role

```prisma
enum Role {
  ADMIN
  EDITOR
  ARTIST
  DOOR      // scanner only — nothing else in admin
}
```

`DOOR` reuses `requireRole`, which already fails closed. Create a door account
per event, hand the login to staff, disable it after. No new auth machinery, and
nobody on the door can see revenue.

---

## 2. Money is an integer

`priceKobo`, `totalKobo`, `unitKobo`, `feesKobo`. Paystack speaks kobo, and
float arithmetic on money produces receipts that do not add up. There is no
float and no `parseFloat` anywhere in this feature.

---

## 3. Checkout — and the overselling race

The obvious design is "check if tickets remain, then start the payment." **That
is a race and it will oversell.** Payment takes minutes, and every other buyer
passes the same check in that window. You sell 400 seats in a 300-seat room and
find out at the door.

Hold inventory with a conditional update and let the database arbitrate:

```ts
// src/lib/actions/tickets.ts
const held = await tx.$executeRaw`
  UPDATE "TicketTier"
  SET held = held + ${qty}
  WHERE id = ${tierId}
    AND active = true
    AND "isComp" = false
    AND (allocation - sold - held) >= ${qty}
    AND (${now} BETWEEN COALESCE("salesStartsAt", ${now}) AND COALESCE("salesEndsAt", ${now}))
`;
if (held === 0) throw new SoldOutError(tierId);
```

Zero rows affected means no room, or the tier's window has closed. No
read-then-write anywhere.

The flow:

```
Buyer picks tiers and quantities
  → Server Action: in ONE transaction, hold every tier and create
    Order(PENDING, holdsUntil = now + 15 min) with a generated reference
  → Server calls Paystack /transaction/initialize
  → Redirect to the returned authorization_url
  → Buyer pays on Paystack
  → Paystack POSTs our webhook  ← tickets are issued HERE, nowhere else
  → Buyer lands on /events/<slug>/order/<reference>
```

Re-resolve prices and sales windows **server-side at purchase time**. A page
cached while Early Bird was open must not sell at Early Bird prices an hour
after it closed.

Guest checkout — name, email, phone. No account required. Forcing a signup to
buy a ticket loses sales, and the order page plus the email is enough to get
people their QR codes.

---

## 4. Paystack

### Initialize (server only)

```ts
POST https://api.paystack.co/transaction/initialize
{
  email: order.buyerEmail,
  amount: order.totalKobo,
  reference: order.reference,
  callback_url: `${SITE_URL}/events/${slug}/order/${order.reference}`,
  metadata: { eventId, orderId }
}
```

Never initialise from the browser — the amount would be client-controlled.

### Webhook — the only place tickets are issued

`src/app/api/webhooks/paystack/route.ts`

1. Read the **raw** body. Next.js parsing it first breaks the signature — use
   `await req.text()`, not `req.json()`.
2. Verify `x-paystack-signature`: HMAC-SHA512 of the raw body with the secret
   key. Mismatch → 401 and stop.
3. Only act on `charge.success`.
4. Find the order by `reference`. **Unknown reference → return 200 anyway**, or
   Paystack retries forever against a reference that will never exist.
5. **If the order is already PAID, return 200 and do nothing.** Paystack retries
   until it gets a 200, so duplicates are normal, and without this check a
   retry issues a second set of tickets.
6. In one transaction: status → PAID, `paidAt`, `feesKobo` from the payload,
   `tier.held -= n`, `tier.sold += n`, create `n` Ticket rows with random codes.
7. Queue the email outside the transaction.
8. Return 200.

### The redirect proves nothing

A buyer can reach the callback URL without paying. Tickets come from the webhook.

But when the order page loads and the order is still PENDING, call
`/transaction/verify/:reference` once, server-side, and settle it from that if
Paystack says it succeeded. Webhooks are occasionally slow and otherwise the
buyer stares at "pending" with their money gone.

### Env

```
PAYSTACK_SECRET_KEY=""
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=""
```

> **Paystack cannot reach localhost.** Webhooks only go to public HTTPS. Run a
> tunnel against the test keys, or develop against `/transaction/verify` and
> test the webhook separately. Otherwise nothing is ever issued and it looks
> like a bug in your code.

---

## 5. Tickets and delivery

- **Code**: `crypto.randomUUID()` or 16 random bytes, base32. Never sequential —
  a guessable code means anyone who buys one ticket can mint more.
- **QR**: encode the code, or a URL containing it. Generate server-side with the
  `qrcode` package. `qrcode.react` is client-only and cannot produce an email
  attachment.
- **Email** (Resend, already wired): order summary plus one QR per ticket.
  **Attach the QR as a PNG per ticket** and link to the order page. Inline
  data-URI images are blocked by several mail clients, so a data URI alone means
  a buyer with no ticket.
- **Order page** `/events/<slug>/order/<reference>`: status, every QR, and a
  print view. Unguessable URL, no login. This is the fallback when email fails,
  which it will.

---

## 6. The gate tracker

### Scanning is a race too

Two staff, two phones, one screenshotted QR, the same second. A boolean
read-then-written loses that race:

```ts
const { count } = await prisma.ticket.updateMany({
  where: { code, usedAt: null, voidedAt: null },
  data: { usedAt: new Date(), usedBy: staffId },
});
```

`count === 1` → admit. `count === 0` → look up why and **say which**, because the
person on the door has about twenty seconds:

- **already scanned at 19:42** — someone is reusing a screenshot
- **refunded / voided** — not valid
- **not a valid ticket** — wrong event, or fake

Three different messages, three different colours, loud enough to read in the
dark.

### Manual lookup is not optional

A real door has people with a cracked screen, a dead phone, or an email they
cannot find. Without a fallback they become a queue.

`/admin/scan` needs a **search by email, name or reference** that lists that
buyer's tickets and lets staff check them in by hand, with the same atomic
update. Expect to use it for a noticeable share of entries.

### Venue network

Lagos venue wifi will fail. At minimum the scanner must fail **loudly** rather
than silently queueing scans that never land. Better: let it pre-load the
event's valid codes when it has signal, validate locally, and reconcile check-ins
when the network returns.

### Live tracker

A view showing, for the event: sold, checked in, remaining, comps issued and
redeemed, and a scan-rate line over the evening. This is the "tracker" — the
thing you watch from the back of the room.

---

## 7. Admin

### Event ticketing tab

Tiers: name, price, allocation, sales window, max per order, comp flag, order,
active. Live sold/held/remaining per tier.

### Comps

Issue tickets with no order — pick tier, quantity, holder name, record who
issued them. They scan like any other ticket. If comps are handed out outside
the system the capacity maths is wrong on the night, which is the whole reason
`isComp` tiers exist.

### Attendees

Searchable list: name, email, tier, order reference, checked-in time. CSV export.

### Refunds

Two halves, and the second is the one people forget:

1. Call Paystack's refund API.
2. **Set `voidedAt` on the tickets.** A refunded ticket that still scans is
   someone walking in free.

Also release the inventory: `sold -= n`, so the seats go back on sale.

### Settlement — the "on behalf of" answer

For an event with `presentedBy` set, one summary:

```
Gross               ₦1,240,000
Paystack fees        −₦ 18,600     (actual, from feesKobo)
Refunds              −₦ 30,000
Net                  ₦1,191,400
Host share (70%)     ₦  833,980    ← what you owe them
AfroLitPlaylist      ₦  357,420
```

Computed from `hostShareBps` and real recorded fees. Mark `settledAt` when paid.
This is what makes "how much do I owe them after the show" a screen rather than
a spreadsheet, and it is the main thing the on-behalf-of case needs.

---

## 8. Release expired holds — done

The original plan was `GET /api/cron/release-holds` every 5 minutes. That job was not added. A 5-minute cron would wake Neon all day.

What shipped instead, in `src/lib/holds.ts`:

- `releaseExpiredHolds` finds `PENDING` orders whose `holdsUntil` is in the past (up to 40 at a time). For each one, in a transaction, it sets `EXPIRED` only if the order is still `PENDING`, then subtracts the quantity from the event hold and each tier hold.
- It runs from the checkout page (`listCheckoutTiers`), from `startCheckout`, from the admin event editor, and from the daily publish cron.
- `releaseBuyerHoldsTx` runs inside the checkout transaction, behind `pg_advisory_xact_lock`, so one email cannot stack two open holds for the same event. If the new checkout fails, the earlier hold stays.
- Rate limits live in `LIMITS.checkout` (5 per email per hour) and `LIMITS.checkoutIp` (8 per address per hour).
- A late `charge.success` or return visit still calls `fulfillPaidOrder`. An `EXPIRED` order takes the tickets again when they are free. When they are not, it writes `refundNote` and does not issue tickets.

---

## 9. Build order

1. Schema + migration. Confirm against the live schema first.
2. Admin tier management. No buying yet — just create tiers on a test event.
3. Checkout with holds + Paystack initialize, in **test** mode.
4. Webhook: signature, idempotency, ticket issuance. Tunnel or verify-endpoint.
5. Order page + email with QR attachments.
6. `/admin/scan`: camera, atomic check-in, three failure messages, manual lookup.
7. Live tracker + attendee list + CSV.
8. Comps, refunds, settlement summary. **Still open.** Wait for the live Paystack key.
9. Hold release. **Done**, without a 5-minute cron. See section 8.

Steps 3 and 4 are where the bugs live. Everything after is ordinary CRUD.

---

## 10. Before the first real sale

- Live Paystack keys — they need the business verified, which takes longer than
  the code. Start it now if it is not done.
- Webhook URL registered in the Paystack dashboard.
- Decide whether the transaction fee is added on top of the ticket price or
  absorbed into it — before prices are published.
- A written refund and cancellation policy, shown at checkout.
- For an on-behalf-of event: the share and payout timing agreed **in writing**
  with the host before tickets go on sale, and recorded in `settlementNote`.

---

## 11. Test before taking money

Beyond the obvious, these four are the ones that break in production:

1. Two browsers buying the last ticket at the same moment → one succeeds, one is
   told it is sold out. Never both.
2. Replay the same `charge.success` webhook twice → tickets issued once.
3. Scan the same QR on two phones at once → one admits, one says *already
   scanned*, with a time.
4. Abandon a checkout → 15 minutes later the seats are back on sale. This is
   implemented. The seats return on the next checkout load, the next checkout
   start, the next opening of that event in admin, or the daily publish job.
   They do not return on a 5-minute timer.
