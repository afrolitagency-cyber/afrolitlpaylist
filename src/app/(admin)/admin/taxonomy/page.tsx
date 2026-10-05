import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { TaxonomyManager, type Term } from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  const user = await requireRole(...can.manageContent);

  const [cats, cols] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } }),
    prisma.galleryCollection.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { images: true } } } }),
  ]);

  const categories: Term[] = cats.map((c: { id: string; name: string; slug: string; _count: { posts: number } }) => ({
    id: c.id, name: c.name, slug: c.slug, count: c._count.posts,
  }));
  const collections: Term[] = cols.map((c: { id: string; name: string; slug: string; _count: { images: number } }) => ({
    id: c.id, name: c.name, slug: c.slug, count: c._count.images,
  }));

  return (
    <AdminShell role={user.role} email={user.email} title="Categories & collections"
      subtitle="Taxonomy for the blog and gallery">
      <TaxonomyManager categories={categories} collections={collections} />
    </AdminShell>
  );
}
