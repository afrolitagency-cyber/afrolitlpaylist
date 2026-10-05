import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { MediaUploader } from "@/components/admin/MediaUploader";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const user = await requireRole(...can.manageContent);
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 120 });

  return (
    <AdminShell role={user.role} email={user.email} title="Media library" subtitle="Images and audio on Cloudinary">
      <MediaUploader />
      <div className="mt-5 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {assets.length === 0 ? (
          <p className="col-span-full rounded-xl border border-(--border-strong) bg-(--card-bg) p-6 text-sm text-(--sub-text)">
            Nothing uploaded yet.
          </p>
        ) : (
          assets.map((a: { id: string; url: string; kind: string; createdAt: Date }) => (
            <div key={a.id} className="overflow-hidden rounded-lg border border-(--border-strong) bg-(--card-bg)">
              {a.kind === "image" ? (
                <div className="relative aspect-square bg-(--surface)">
                  <Image src={a.url} alt="" fill sizes="200px" className="object-cover" />
                </div>
              ) : (
                <div className="grid aspect-square place-items-center bg-(--surface) text-xs text-(--sub-text)">Audio</div>
              )}
              <div className="p-2.5">
                <span className="block truncate text-[11.5px] text-(--sub-text)">{a.createdAt.toLocaleDateString("en-GB")}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
