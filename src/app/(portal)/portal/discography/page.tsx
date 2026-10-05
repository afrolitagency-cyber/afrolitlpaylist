import { prisma } from "@/lib/prisma";
import { currentArtist } from "@/lib/actions/portal";
import { DiscographyManager, type Release } from "@/components/portal/DiscographyManager";

export const dynamic = "force-dynamic";

export default async function PortalDiscography() {
  const artist = await currentArtist();
  if (!artist) return <p className="text-sm text-(--sub-text)">No artist profile linked to this account.</p>;

  const rows = await prisma.discography.findMany({
    where: { artistId: artist.id },
    orderBy: [{ releaseDate: "desc" }, { createdAt: "desc" }],
  });

  const releases: Release[] = rows.map((r: {
    id: string; title: string; type: string; releaseDate: Date | null;
    coverArt: string | null; streamUrl: string | null; published: boolean;
  }) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    releaseDate: r.releaseDate ? r.releaseDate.toISOString().slice(0, 10) : "",
    coverArt: r.coverArt ?? "",
    streamUrl: r.streamUrl ?? "",
    published: r.published,
  }));

  return (
    <>
      <h1 className="mb-1 text-2xl font-black">Discography</h1>
      <p className="mb-6 text-sm text-(--sub-text)">
        These publish immediately — no review. An editor can unpublish a release if something is wrong.
      </p>
      <DiscographyManager artistId={artist.id} releases={releases} />
    </>
  );
}
