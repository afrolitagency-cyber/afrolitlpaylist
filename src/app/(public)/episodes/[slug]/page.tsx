import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { ViewBeacon } from "@/components/public/ViewBeacon";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await prisma.episode.findUnique({ where: { slug }, select: { title: true, excerpt: true, coverImage: true } });
  if (!e) return { title: "Not found" };
  return {
    alternates: { canonical: `/episodes/${slug}` },
    title: e.title,
    description: e.excerpt ?? undefined,
    openGraph: { title: e.title, type: "article", images: e.coverImage ? [e.coverImage] : undefined },
  };
}

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = await prisma.episode.findUnique({ where: { slug } });
  if (!episode || episode.status !== "PUBLISHED") notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    datePublished: episode.publishedAt?.toISOString(),
    description: episode.excerpt ?? undefined,
    associatedMedia: episode.audioUrl ? { "@type": "MediaObject", contentUrl: episode.audioUrl } : undefined,
  };

  const platforms = [
    ["Spotify", episode.spotifyUrl],
    ["Apple Podcasts", episode.appleUrl],
    ["YouTube", episode.youtubeUrl],
  ].filter((p): p is [string, string] => Boolean(p[1]));

  return (
    <article className="wrap py-8">
      <ViewBeacon path={`/episodes/${episode.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-3 text-xs text-(--sub-text)">
        <Link href="/episodes" className="hover:text-(--primary)">Episodes</Link>
        {episode.season ? ` › Season ${episode.season}` : ""}
      </p>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-(--surface)">
          {episode.coverImage ? <Image src={episode.coverImage} alt="" fill sizes="240px" className="object-cover" priority /> : null}
        </div>

        <div>
          <span className="text-xs font-bold uppercase text-(--primary)">
            {episode.season ? `S${String(episode.season).padStart(2, "0")} · ` : ""}
            {episode.number ? `Episode ${episode.number}` : "Episode"}
          </span>
          <h1 className="mt-2 text-[clamp(26px,3.6vw,40px)] font-black leading-tight">{episode.title}</h1>
          {episode.excerpt ? <p className="mt-3 text-(--sub-text)">{episode.excerpt}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-(--sub-text)">
            {episode.durationSec ? <span>{Math.round(episode.durationSec / 60)} min</span> : null}
            {episode.publishedAt ? <span>{episode.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span> : null}
          </div>

          {episode.audioUrl ? (
            <audio controls preload="none" src={episode.audioUrl} className="mt-5 w-full">
              <track kind="captions" />
            </audio>
          ) : null}

          {platforms.length ? (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {platforms.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="rounded-full border border-(--border-strong) px-4 py-2 text-[13px] font-semibold hover:border-(--primary) hover:text-(--primary)">
                  {label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {episode.showNotes ? (
        <section className="mx-auto mt-10 max-w-[760px]">
          <h2 className="mb-4 text-2xl font-extrabold">Show notes</h2>
          <div className="text-(--sub-text) [&_h2]:text-(--body-text) [&_strong]:text-(--body-text)">
            <BlockRenderer body={episode.showNotes} />
          </div>
        </section>
      ) : null}
    </article>
  );
}
