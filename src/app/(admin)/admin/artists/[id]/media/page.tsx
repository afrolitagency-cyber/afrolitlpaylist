import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { ArtistMediaEditor, type MomentItem, type StoryItem } from "@/components/admin/ArtistMediaEditor";
import { inlineText, isBlockArray, type Block } from "@/lib/blocks";

export const dynamic = "force-dynamic";

export default async function ArtistMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.manageContent);

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      moments: { orderBy: { position: "asc" } },
      stories: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!artist) notFound();

  const moments: MomentItem[] = artist.moments.map((m: { id: string; mediaUrl: string; caption: string | null; position: number }) => ({
    id: m.id, mediaUrl: m.mediaUrl, caption: m.caption ?? "", position: m.position,
  }));

  const stories: StoryItem[] = artist.stories.map((s: { id: string; title: string; coverImage: string | null; body: unknown; publishedAt: Date | null }) => ({
    id: s.id,
    title: s.title,
    coverImage: s.coverImage ?? "",
    bodyText: isBlockArray(s.body) ? (s.body as Block[]).map((b) => inlineText(b.content)).join("\n\n") : "",
    published: Boolean(s.publishedAt),
  }));

  return (
    <AdminShell role={user.role} email={user.email} title="Moments & stories" subtitle={artist.name}
      actions={
        <Link href={`/admin/artists/${artist.id}/review`} className="rounded border border-(--border-strong) px-4 py-2 text-sm font-bold">
          Review profile
        </Link>
      }>
      <ArtistMediaEditor artistId={artist.id} moments={moments} stories={stories} />
    </AdminShell>
  );
}
