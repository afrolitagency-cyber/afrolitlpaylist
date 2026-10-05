import Link from "next/link";
import { searchAll, HREF, type SearchHit } from "@/lib/search";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search", robots: { index: false } };

const LABEL: Record<SearchHit["kind"], string> = {
  artist: "Artists", post: "Posts", episode: "Episodes", event: "Events",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const hits = term ? await searchAll(term) : [];

  const groups = (["artist", "post", "episode", "event"] as const)
    .map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="wrap py-8">
      <h1 className="mb-5 text-[clamp(28px,4vw,44px)] font-black">Search</h1>

      <form action="/search" className="mb-8 flex max-w-xl overflow-hidden rounded border border-(--border) bg-(--input-bg)">
        <input name="q" defaultValue={term} placeholder="Artists, posts, episodes, events" aria-label="Search"
          className="min-w-0 flex-1 bg-transparent p-3.5 text-sm outline-none" />
        <button type="submit" className="bg-(--primary) px-6 text-sm font-semibold text-white">Search</button>
      </form>

      {!term ? (
        <p className="text-(--sub-text)">Type something to search the site.</p>
      ) : hits.length === 0 ? (
        <EmptyState title={`Nothing found for “${term}”`} body="Try fewer words, or a different spelling." />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.kind}>
              <h2 className="mb-3 text-xl font-extrabold">{LABEL[g.kind]}</h2>
              {g.items.map((h) => (
                <Link key={`${h.kind}-${h.slug}`} href={HREF[h.kind](h.slug)}
                  className="block border-b border-(--border-strong) py-3 last:border-0 hover:text-(--primary)">
                  <b className="text-sm">{h.title}</b>
                  {h.sub ? <span className="ml-2 text-xs text-(--sub-text)">{h.sub}</span> : null}
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
