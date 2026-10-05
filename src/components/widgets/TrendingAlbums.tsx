import Link from "next/link";
import Image from "next/image";
import { getTrendingAlbums } from "@/lib/widgets";

/** Five square covers. Hides itself when no artist has published a release. */
export async function TrendingAlbums() {
  const albums = await getTrendingAlbums();
  if (albums.length === 0) return null;

  return (
    <section className="py-2">
      <h2 className="mb-4 text-xl font-black uppercase tracking-tight">Trending albums</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {albums.map((a) => (
          <Link key={`${a.artistSlug}-${a.title}`} href={a.href} className="block">
            <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-(--surface)">
              {a.cover ? <Image src={a.cover} alt="" fill sizes="200px" className="object-cover" /> : null}
            </div>
            <span className="text-[11px] font-bold uppercase text-(--sub-text)">{a.artist}</span>
            <h4 className="text-[13px] font-extrabold">{a.title}</h4>
            {a.year ? <span className="text-xs text-(--sub-text)">{a.year}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
