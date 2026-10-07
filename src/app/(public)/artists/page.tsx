import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/ui/Pagination";
import { GENRES, canonicalGenre, parseGenres } from "@/lib/genres";

export const revalidate = 600;
export const metadata = { title: "Artists" };

const PER_PAGE = 24;

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ genre?: string; page?: string }> }) {
  const { genre, page } = await searchParams;
  const current = Math.max(1, Number(page ?? 1) || 1);

  const selected = genre ? canonicalGenre(genre) : null;
  const where = {
    status: "LIVE" as const,
    ...(selected
      ? {
          OR: [
            { genre: { equals: selected, mode: "insensitive" as const } },
            { genre: { startsWith: `${selected} ·`, mode: "insensitive" as const } },
            { genre: { endsWith: ` · ${selected}`, mode: "insensitive" as const } },
            { genre: { contains: ` · ${selected} ·`, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [artists, total, allGenres] = await Promise.all([
    prisma.artist.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (current - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { slug: true, name: true, genre: true, avatarImage: true, monthlyListeners: true },
    }),
    prisma.artist.count({ where }),
    prisma.artist.findMany({ where: { status: "LIVE" }, select: { genre: true }, distinct: ["genre"] }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const present = new Set(allGenres.flatMap((a: { genre: string | null }) => parseGenres(a.genre)));
  const genres = GENRES.filter((item) => present.has(item));

  return (
    <div className="wrap py-8">
      <h1 className="mb-2 text-[clamp(28px,4vw,44px)] font-black">Artists</h1>
      <p className="mb-6 text-(--sub-text)">Profiles, discography, moments and upcoming shows.</p>

      {genres.length ? (
        <div className="mb-7 flex flex-wrap gap-2">
          <Link href="/artists" className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${!selected ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text)"}`}>All</Link>
          {genres.map((g) => (
            <Link key={g} href={`/artists?genre=${encodeURIComponent(g)}`}
              className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${selected === g ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text) hover:text-(--body-text)"}`}>
              {g}
            </Link>
          ))}
        </div>
      ) : null}

      {artists.length === 0 ? (
        <p className="text-(--sub-text)">No artists are live yet.</p>
      ) : (
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {artists.map((a: { slug: string; name: string; genre: string | null; avatarImage: string | null; monthlyListeners: number | null }) => (
            <Link key={a.slug} href={`/artists/${a.slug}`}
              className="rounded-xl bg-(--card-bg) p-5 text-center transition-transform hover:-translate-y-1">
              <div className="relative mx-auto mb-3.5 size-24 overflow-hidden rounded-full border-2 border-(--border-strong) bg-(--surface)">
                {a.avatarImage ? <Image src={a.avatarImage} alt="" fill sizes="96px" className="object-cover" /> : null}
              </div>
              <h3 className="font-extrabold">{a.name}</h3>
              {a.genre ? <p className="mt-1 text-xs font-bold uppercase text-(--primary)">{a.genre}</p> : null}
              {a.monthlyListeners ? (
                <p className="mt-2 text-xs text-(--sub-text)">{a.monthlyListeners.toLocaleString()} monthly listeners</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
      <Pagination page={current} pages={pages} basePath="/artists" params={{ genre }} />
    </div>
  );
}
