import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { EpisodeForm, type EpisodeValues } from "@/components/admin/EpisodeForm";

export const dynamic = "force-dynamic";

function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK: EpisodeValues = {
  title: "", slug: "", excerpt: "", audioUrl: "", coverImage: "", durationSec: "",
  season: "", number: "", spotifyUrl: "", appleUrl: "", youtubeUrl: "",
  status: "DRAFT", publishedAt: "", featured: false, commentsOn: true,
};

export default async function EpisodeEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.manageContent);
  const isNew = id === "new";

  const episode = isNew ? null : await prisma.episode.findUnique({ where: { id } });
  if (!isNew && !episode) notFound();

  const values: EpisodeValues = episode
    ? {
        id: episode.id,
        title: episode.title,
        slug: episode.slug,
        excerpt: episode.excerpt ?? "",
        audioUrl: episode.audioUrl ?? "",
        coverImage: episode.coverImage ?? "",
        durationSec: episode.durationSec ? String(episode.durationSec) : "",
        season: episode.season ? String(episode.season) : "",
        number: episode.number ? String(episode.number) : "",
        spotifyUrl: episode.spotifyUrl ?? "",
        appleUrl: episode.appleUrl ?? "",
        youtubeUrl: episode.youtubeUrl ?? "",
        status: episode.status,
        publishedAt: forInput(episode.publishedAt),
        featured: episode.featured,
        commentsOn: episode.commentsOn,
      }
    : BLANK;

  return (
    <AdminShell role={user.role} email={user.email} title={isNew ? "New episode" : "Edit episode"} subtitle={episode?.title ?? "Draft"}>
      <EpisodeForm values={values} />
    </AdminShell>
  );
}
