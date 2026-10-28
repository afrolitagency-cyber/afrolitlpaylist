import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { Pagination } from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRole(...can.manageContent);
  const requested = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const total = await prisma.mediaAsset.count();
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(requested, pages);
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * PER_PAGE,
    take: PER_PAGE,
  });

  return (
    <AdminShell role={user.role} email={user.email} title="Media library" subtitle="Images and audio on Cloudinary">
      <p className="mb-5 text-sm text-(--sub-text)">
        24 files per page. Delete frees the Cloudinary file when no post, event, or artist page still uses it.
      </p>
      <MediaUploader />
      <MediaLibrary
        assets={assets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          kind: asset.kind,
          createdAt: asset.createdAt.toLocaleDateString("en-GB"),
          bytes: asset.bytes,
        }))}
      />
      <Pagination page={current} pages={pages} basePath="/admin/media" />
    </AdminShell>
  );
}
