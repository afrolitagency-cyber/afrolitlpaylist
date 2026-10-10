import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { AlbumForm, type AlbumFormValues } from "@/components/admin/AlbumForm";
import { readLinks } from "@/lib/album-platforms";

export const dynamic = "force-dynamic";

export default async function AlbumEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const user = await requireRole(...can.manageContent);
  const isNew = id === "new";

  const [album, artists, nextRank] = await Promise.all([
    isNew ? null : prisma.album.findUnique({ where: { id } }),
    prisma.artist.findMany({ orderBy: { name: "asc" }, take: 300, select: { id: true, name: true } }),
    isNew ? prisma.album.count({ where: { published: true } }) : 0,
  ]);
  if (!isNew && !album) notFound();

  const values: AlbumFormValues = album
    ? {
        id: album.id,
        slug: album.slug,
        title: album.title,
        artistName: album.artistName,
        artistId: album.artistId ?? "",
        releaseYear: album.releaseYear ? String(album.releaseYear) : "",
        genre: album.genre ?? "",
        summary: album.summary ?? "",
        about: album.about ?? "",
        tracks: album.tracks.join("\n"),
        coverImage: album.coverImage ?? "",
        links: readLinks(album.links),
        rank: String(album.rank),
        movement: String(album.movement),
        published: album.published,
      }
    : {
        title: "", artistName: "", artistId: "", releaseYear: String(new Date().getFullYear()), genre: "",
        summary: "", about: "", tracks: "", coverImage: "", links: {},
        rank: String(nextRank + 1), movement: "0", published: true,
      };

  return (
    <AdminShell
      role={user.role}
      email={user.email}
      title={isNew ? "New album" : album?.title ?? "Album"}
      subtitle="Add an album to the trending chart. Readers are sent to the music apps you link."
    >
      <AlbumForm values={values} artists={artists} created={created === "1"} />
    </AdminShell>
  );
}
