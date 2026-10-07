import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { ArtistForm, type ArtistFormValues } from "@/components/admin/ArtistForm";
import type { PendingProfile } from "@/lib/services/review";

export const dynamic = "force-dynamic";

const BLANK: ArtistFormValues = {
  name: "",
  genre: "",
  location: "",
  bio: "",
  coverImage: "",
  avatarImage: "",
  streamEmbedUrl: "",
  status: "DRAFT",
  claimedEmail: "",
  openSubmission: false,
};

export default async function ArtistEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.manageContent);
  const isNew = id === "new";

  const artist = isNew
    ? null
    : await prisma.artist.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          genre: true,
          location: true,
          bio: true,
          coverImage: true,
          avatarImage: true,
          streamEmbedUrl: true,
          status: true,
          pendingProfile: true,
          user: { select: { email: true } },
        },
      });

  if (!isNew && !artist) notFound();

  const pending = (artist?.pendingProfile ?? {}) as PendingProfile;
  const text = (key: "name" | "genre" | "location" | "bio" | "coverImage" | "avatarImage" | "streamEmbedUrl", live: string | null) => {
    const next = pending[key];
    return typeof next === "string" ? next : live ?? "";
  };

  const values: ArtistFormValues = artist
    ? {
        id: artist.id,
        name: text("name", artist.name),
        genre: text("genre", artist.genre),
        location: text("location", artist.location),
        bio: text("bio", artist.bio),
        coverImage: text("coverImage", artist.coverImage),
        avatarImage: text("avatarImage", artist.avatarImage),
        streamEmbedUrl: text("streamEmbedUrl", artist.streamEmbedUrl),
        status: artist.status,
        claimedEmail: artist.user?.email ?? "",
        openSubmission: artist.status === "PENDING" || artist.status === "CHANGES_REQUESTED",
      }
    : BLANK;

  return (
    <AdminShell
      role={user.role}
      email={user.email}
      title={isNew ? "New artist" : artist?.name ?? "Artist"}
      subtitle={isNew ? "Create a profile without waiting for an invite" : "Edits here publish without an artist submission"}
    >
      <ArtistForm values={values} canInvite={user.role === "ADMIN"} />
    </AdminShell>
  );
}
