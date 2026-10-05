import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

export default async function AdminEpisodes() {
  const user = await requireRole(...can.manageContent);
  const episodes = await prisma.episode.findMany({ orderBy: [{ season: "desc" }, { number: "desc" }], take: 100 });

  return (
    <AdminShell role={user.role} email={user.email} title="Episodes" subtitle="Podcast episodes and audio publishing"
      actions={<Link href="/admin/episodes/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">+ New episode</Link>}>
      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {episodes.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No episodes yet.</p>
        ) : (
          episodes.map((e: { id: string; title: string; season: number | null; number: number | null; durationSec: number | null; status: string; publishedAt: Date | null }) => (
            <div key={e.id} className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/episodes/${e.id}`} className="block truncate text-sm font-bold hover:text-(--primary)">{e.title}</Link>
                <span className="text-xs text-(--sub-text)">
                  {e.season ? `S${String(e.season).padStart(2, "0")}` : "—"}
                  {e.number ? ` · E${e.number}` : ""}
                  {e.durationSec ? ` · ${Math.round(e.durationSec / 60)} min` : ""}
                </span>
              </div>
              <span className="hidden text-xs text-(--sub-text) sm:block">
                {e.publishedAt ? e.publishedAt.toLocaleDateString("en-GB") : "—"}
              </span>
              <StatusPill status={e.status} />
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
