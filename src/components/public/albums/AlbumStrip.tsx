import Link from "next/link";
import type { ChartAlbum } from "@/lib/albums";
import { AlbumCover } from "./AlbumCover";

/** Street-template layout: five square covers with artist and title. */
export function AlbumStrip({ albums }: { albums: ChartAlbum[] }) {
  const top = albums.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <section className="py-10" aria-labelledby="trending-albums-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 id="trending-albums-title" className="text-xl font-black uppercase tracking-tight">Trending albums</h2>
        <Link href="/albums" className="text-xs font-bold uppercase tracking-wide text-(--primary) hover:underline">
          Full chart →
        </Link>
      </div>
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {top.map((a) => (
          <li key={a.slug}>
            <Link href={`/albums/${a.slug}`} className="group block">
              <span className="relative mb-2 block aspect-square overflow-hidden rounded-md bg-(--surface)">
                <AlbumCover title={a.title} src={a.coverImage} sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 240px" />
              </span>
              <span className="block text-[11px] font-bold uppercase text-(--sub-text)">{a.artistName}</span>
              <span className="mt-0.5 block text-[13px] font-extrabold group-hover:text-(--primary)">{a.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
