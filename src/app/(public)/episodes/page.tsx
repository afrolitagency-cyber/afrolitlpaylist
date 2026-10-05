import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;
export const metadata = { title: "Episodes" };

function hhmm(sec: number | null) {
  if (!sec) return "";
  return `${Math.round(sec / 60)} min`;
}

export default async function EpisodesPage() {
  const episodes = await prisma.episode.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="wrap py-8">
      <h1 className="mb-2 text-[clamp(28px,4vw,44px)] font-black">Episodes</h1>
      <p className="mb-7 text-(--sub-text)">Conversations with artists, producers and the people moving the scene.</p>

      {episodes.length === 0 ? (
        <p className="text-(--sub-text)">No episodes published yet.</p>
      ) : (
        <div className="space-y-3.5">
          {episodes.map((e: {
            id: string; slug: string; title: string; excerpt: string | null; coverImage: string | null;
            audioUrl: string | null; durationSec: number | null; season: number | null;
            number: number | null; publishedAt: Date | null;
          }) => (
            <article key={e.id} className="flex flex-wrap items-center gap-5 rounded-xl bg-(--card-bg) p-4">
              <div className="relative size-[110px] shrink-0 overflow-hidden rounded-lg bg-(--surface)">
                {e.coverImage ? <Image src={e.coverImage} alt="" fill sizes="110px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase text-(--primary)">
                  {e.season ? `S${String(e.season).padStart(2, "0")} · ` : ""}Episode {e.number ?? "—"}
                </span>
                <h2 className="mt-1 text-lg font-extrabold"><Link href={`/episodes/${e.slug}`} className="hover:text-(--primary)">{e.title}</Link></h2>
                {e.excerpt ? <p className="mt-1.5 text-sm leading-relaxed text-(--sub-text)">{e.excerpt}</p> : null}
                <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-(--sub-text)">
                  <span>{hhmm(e.durationSec)}</span>
                  {e.publishedAt ? <span>{e.publishedAt.toLocaleDateString("en-GB")}</span> : null}
                </div>
                {e.audioUrl ? (
                  <audio controls preload="none" src={e.audioUrl} className="mt-3 w-full">
                    <track kind="captions" />
                  </audio>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
