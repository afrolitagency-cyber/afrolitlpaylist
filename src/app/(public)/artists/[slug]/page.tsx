import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = await prisma.artist.findUnique({ where: { slug }, select: { name: true, bio: true, avatarImage: true } });
  if (!artist) return { title: "Not found" };
  return {
    alternates: { canonical: `/artists/${slug}` },
    title: artist.name,
    description: artist.bio?.slice(0, 160) ?? undefined,
    openGraph: { title: artist.name, images: artist.avatarImage ? [artist.avatarImage] : undefined },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      discography: { where: { published: true }, orderBy: { releaseDate: "desc" }, include: { tracks: { orderBy: { position: "asc" } } } },
      moments: { orderBy: { position: "asc" } },
      stories: { where: { publishedAt: { not: null } }, orderBy: { publishedAt: "desc" }, take: 4 },
      posts: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 4, select: { slug: true, title: true, publishedAt: true } },
      events: { where: { status: "PUBLISHED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } },
    },
  });

  if (!artist || artist.status !== "LIVE") notFound();

  const socials = (artist.socials ?? {}) as Record<string, string>;

  return (
    <div className="wrap py-8">
      <p className="mb-3 text-xs text-(--sub-text)">
        <Link href="/artists" className="hover:text-(--primary)">Artists</Link> › {artist.name}
      </p>

      <div className="relative h-[clamp(180px,30vw,300px)] overflow-hidden rounded-xl bg-(--surface)">
        {artist.coverImage ? <Image src={artist.coverImage} alt="" fill sizes="100vw" className="object-cover" priority /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
      </div>

      <div className="relative z-10 -mt-16 flex flex-wrap items-end gap-5 px-4 sm:px-7">
        <div className="relative size-32 shrink-0 overflow-hidden rounded-full border-4 border-(--body-bg) bg-(--surface)">
          {artist.avatarImage ? <Image src={artist.avatarImage} alt="" fill sizes="128px" className="object-cover" /> : null}
        </div>
        <div className="pb-2">
          <h1 className="text-[clamp(24px,3.4vw,38px)] font-black text-white drop-shadow">{artist.name}</h1>
          <p className="mt-1 text-sm text-white/80">
            {[artist.genre, artist.location].filter(Boolean).join(" · ")}
            {artist.verified ? " · Verified artist" : ""}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {artist.bio ? (
            <>
              <h2 className="mb-3 text-2xl font-extrabold">Biography</h2>
              <p className="mb-8 whitespace-pre-line leading-[1.75] text-(--sub-text)">{artist.bio}</p>
            </>
          ) : null}

          {artist.streamEmbedUrl ? (
            <>
              <h2 className="mb-3 text-2xl font-extrabold">Listen</h2>
              <div className="mb-8 overflow-hidden rounded-lg">
                <iframe src={artist.streamEmbedUrl} title={`${artist.name} player`} loading="lazy"
                  className="h-[180px] w-full border-0" allow="encrypted-media; clipboard-write" />
              </div>
            </>
          ) : null}

          {artist.discography.length ? (
            <>
              <h2 className="mb-3 text-2xl font-extrabold">Discography</h2>
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {artist.discography.map((d: { id: string; title: string; type: string; coverArt: string | null; releaseDate: Date | null; streamUrl: string | null }) => (
                  <a key={d.id} href={d.streamUrl ?? "#"} className="block">
                    <div className="relative mb-2.5 aspect-square overflow-hidden rounded-lg bg-(--surface)">
                      {d.coverArt ? <Image src={d.coverArt} alt="" fill sizes="200px" className="object-cover" /> : null}
                    </div>
                    <span className="text-[10.5px] font-extrabold uppercase text-(--primary)">{d.type}</span>
                    <h4 className="text-sm font-bold">{d.title}</h4>
                    {d.releaseDate ? <span className="text-xs text-(--sub-text)">{d.releaseDate.getFullYear()}</span> : null}
                  </a>
                ))}
              </div>
            </>
          ) : null}

          {artist.moments.length ? (
            <>
              <h2 className="mb-3 text-2xl font-extrabold">Moments</h2>
              <div className="mb-8 flex gap-3.5 overflow-x-auto pb-2">
                {artist.moments.map((m: { id: string; mediaUrl: string; caption: string | null }) => (
                  <figure key={m.id} className="relative h-[250px] w-[190px] shrink-0 overflow-hidden rounded-lg bg-(--surface)">
                    <Image src={m.mediaUrl} alt="" fill sizes="190px" className="object-cover" />
                    {m.caption ? (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-3 text-xs text-white">{m.caption}</figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </>
          ) : null}

          {artist.events.length ? (
            <>
              <h2 className="mb-3 text-2xl font-extrabold">Upcoming events</h2>
              <div className="space-y-3">
                {artist.events.map((e: { id: string; slug: string; title: string; venue: string | null; startsAt: Date }) => (
                  <Link key={e.id} href={`/events/${e.slug}`} className="flex items-center gap-4 rounded-xl bg-(--card-bg) p-4">
                    <div className="w-16 shrink-0 border-r border-(--border-strong) pr-4 text-center">
                      <div className="text-xs font-extrabold uppercase text-(--primary)">
                        {e.startsAt.toLocaleDateString("en-GB", { month: "short" })}
                      </div>
                      <div className="text-2xl font-black">{e.startsAt.getDate()}</div>
                    </div>
                    <div>
                      <h3 className="font-bold">{e.title}</h3>
                      <p className="text-sm text-(--sub-text)">{e.venue}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <aside className="space-y-5">
          {Object.keys(socials).length ? (
            <div className="rounded-xl bg-(--card-bg) p-5">
              <h3 className="mb-3.5 font-extrabold">Socials</h3>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(socials).map(([k, v]) => (
                  <a key={k} href={v} rel="noopener noreferrer" target="_blank"
                    className="rounded-full border border-(--border-strong) px-3.5 py-2 text-[13px] font-semibold capitalize hover:border-(--primary) hover:text-(--primary)">
                    {k}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {artist.posts.length ? (
            <div className="rounded-xl bg-(--card-bg) p-5">
              <h3 className="mb-3.5 font-extrabold">Stories</h3>
              {artist.posts.map((p: { slug: string; title: string; publishedAt: Date | null }) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="block border-b border-(--border-strong) py-3 last:border-0">
                  <span className="text-sm font-bold">{p.title}</span>
                  {p.publishedAt ? <span className="block text-xs text-(--sub-text)">{p.publishedAt.toLocaleDateString("en-GB")}</span> : null}
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
