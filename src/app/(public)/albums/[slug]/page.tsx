import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listenTargets, readLinks } from "@/lib/album-platforms";
import { normalizeEmbedUrl } from "@/lib/embedUrl";
import { AlbumCover, Movement } from "@/components/public/albums/AlbumCover";
import { ListenPicker } from "@/components/public/albums/ListenPicker";

export const revalidate = 300;

async function load(slug: string) {
  return prisma.album.findUnique({
    where: { slug },
    include: { artist: { select: { slug: true, status: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await load(slug);
  if (!album || !album.published) return { title: "Not found" };
  return {
    title: `${album.title} — ${album.artistName}`,
    description: album.summary ?? album.about?.slice(0, 160) ?? undefined,
    alternates: { canonical: `/albums/${slug}` },
    openGraph: { title: album.title, images: album.coverImage ? [album.coverImage] : undefined },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = await load(slug);
  if (!album || !album.published) notFound();

  const ranked = await prisma.album.findMany({
    where: { published: true },
    orderBy: [{ rank: "asc" }, { updatedAt: "desc" }],
    select: { id: true },
  });
  const position = ranked.findIndex((r) => r.id === album.id) + 1;
  const platforms = listenTargets({ title: album.title, artistName: album.artistName, links: readLinks(album.links) })
    .map(({ key, label }) => ({ key, label }));
  const artistHref = album.artist?.status === "LIVE" ? `/artists/${album.artist.slug}` : null;
  const spotifyLink = readLinks(album.links).spotify;
  const player = spotifyLink ? normalizeEmbedUrl(spotifyLink) : null;
  const embed = player && /\/embed\/(album|playlist)\//.test(player) ? player : null;

  return (
    <div className="wrap py-[clamp(36px,6vw,64px)]">
      <Link href="/albums" className="rounded-full border border-(--border-strong) px-4.5 py-2.5 text-[12.5px] hover:border-(--primary) hover:text-(--primary)">
        ← Full chart
      </Link>

      <div className="mb-2 mt-8 flex items-center gap-[clamp(24px,5vw,60px)] max-sm:flex-col max-sm:text-center">
        <div className="relative aspect-square w-[clamp(180px,30vw,340px)] flex-none sm:mr-[clamp(26px,5vw,60px)]">
          <div className="vinyl absolute right-[-20%] top-[4%] z-[1] aspect-square h-[92%] rounded-full shadow-[0_10px_30px_rgba(0,0,0,.6)] max-sm:hidden" />
          <div className="relative z-[2] h-full w-full overflow-hidden rounded-[22px] shadow-[0_30px_60px_-20px_#000]">
            <AlbumCover title={album.title} src={album.coverImage} sizes="340px" priority />
          </div>
        </div>

        <div className="relative z-[3] min-w-0">
          <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--primary)">
            #{position} Trending <Movement value={album.movement} />
          </span>
          <h1 className="break-words text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-none tracking-tight">{album.title}</h1>
          <p className="mb-[18px] mt-2 text-(--sub-text)">
            {artistHref ? <Link href={artistHref as `/artists/${string}`} className="hover:text-(--primary)">{album.artistName}</Link> : album.artistName}
          </p>
          <div className="mb-[22px] flex flex-wrap gap-[clamp(14px,3vw,28px)] max-sm:justify-center">
            {[
              { value: album.tracks.length || "–", label: "Tracks" },
              { value: album.releaseYear ?? "–", label: "Released" },
              { value: album.genre ?? "–", label: "Genre" },
            ].map((s) => (
              <div key={s.label} className="text-[11px] uppercase tracking-[0.08em] text-(--sub-text)">
                <b className="mb-0.5 block text-[clamp(15px,2vw,19px)] font-bold normal-case tracking-normal text-(--body-text)">{s.value}</b>
                {s.label}
              </div>
            ))}
          </div>
          <ListenPicker slug={album.slug} platforms={platforms} />
        </div>
      </div>

      <div className="mt-7 grid gap-[30px] rounded-3xl border border-(--border-strong) bg-(--card-bg) p-7 md:grid-cols-[1.1fr_.9fr]">
        <div>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.16em] text-(--sub-text)">About this album</h2>
          <p className="whitespace-pre-line text-[15px] leading-[1.7]">{album.about || album.summary || "No description yet."}</p>
        </div>
        <div>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.16em] text-(--sub-text)">Tracklist</h2>
          {embed ? (
            <iframe
              src={`${embed}?utm_source=generator&theme=0`}
              title={`${album.title} by ${album.artistName} on Spotify`}
              className="h-[352px] w-full rounded-xl border-0"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          ) : album.tracks.length ? (
            <ol>
              {album.tracks.map((t, i) => (
                <li key={`${i}-${t}`} className="flex gap-3.5 border-b border-(--border-strong) py-2.5 text-sm">
                  <span className="w-[22px] pt-0.5 text-[11px] font-medium text-(--sub-text)">{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-(--sub-text)">Tracklist coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
