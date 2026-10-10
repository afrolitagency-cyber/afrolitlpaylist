import Link from "next/link";
import { getChart } from "@/lib/albums";
import { AlbumCover, Movement } from "@/components/public/albums/AlbumCover";

export const revalidate = 300;
export const metadata = {
  title: "Trending Albums",
  description: "This week's trending Afro albums, ranked by the AfroLitPlaylist editors.",
  alternates: { canonical: "/albums" },
};

export default async function AlbumsChart() {
  const albums = await getChart(50);

  return (
    <div className="wrap py-[clamp(36px,6vw,64px)]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--primary)">Charts · This week</p>
          <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight">Trending Albums</h1>
        </div>
        <Link href="/" className="rounded-full border border-(--border-strong) px-4.5 py-2.5 text-[12.5px] hover:border-(--primary) hover:text-(--primary)">
          ← Back to home
        </Link>
      </div>

      {albums.length === 0 ? (
        <p className="text-(--sub-text)">The chart is being put together. Check back soon.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {albums.map((a, i) => (
            <li key={a.slug}>
              <Link
                href={`/albums/${a.slug}`}
                className="flex items-center gap-4 rounded-[18px] border border-(--border-strong) bg-(--card-bg) px-[18px] py-3 hover:border-(--primary)"
              >
                <span className="w-6 text-[11px] font-medium text-(--sub-text)">{String(i + 1).padStart(2, "0")}</span>
                <span className="relative size-16 flex-none overflow-hidden rounded-[14px]">
                  <AlbumCover title={a.title} src={a.coverImage} sizes="64px" label={false} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-base">{a.title}</b>
                  <em className="text-xs not-italic text-(--sub-text)">
                    {[a.artistName, a.genre, a.releaseYear].filter(Boolean).join(" · ")}
                  </em>
                </span>
                <Movement value={a.movement} />
                <span className="ml-2 whitespace-nowrap text-xs font-semibold text-(--primary) max-sm:hidden">View album →</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-[18px] text-xs text-(--sub-text)">Ranked by our editors each week.</p>
    </div>
  );
}
