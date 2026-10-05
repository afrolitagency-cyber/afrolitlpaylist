import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { GalleryManager, type GalleryItem } from "@/components/admin/GalleryManager";

export const dynamic = "force-dynamic";

export default async function AdminGallery() {
  const user = await requireRole(...can.manageContent);

  const [rows, collections, events] = await Promise.all([
    prisma.galleryImage.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 120 }),
    prisma.galleryCollection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true } }),
  ]);

  const images: GalleryItem[] = rows.map((i: {
    id: string; url: string; caption: string | null; credit: string | null; altText: string | null;
    collectionId: string | null; eventId: string | null; published: boolean; featured: boolean;
  }) => ({
    id: i.id, url: i.url, caption: i.caption ?? "", credit: i.credit ?? "", altText: i.altText ?? "",
    collectionId: i.collectionId ?? "", eventId: i.eventId ?? "", published: i.published, featured: i.featured,
  }));

  return (
    <AdminShell role={user.role} email={user.email} title="Gallery" subtitle="Curate the public image grid">
      <GalleryManager images={images} collections={collections} events={events} />
    </AdminShell>
  );
}
