import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

/** Real numbers from our own PageView rows — no GA4 dependency. Thin on
 *  purpose: enough to see what's working, not a BI tool. */
export default async function AnalyticsPage() {
  const user = await requireRole(...can.manageContent);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, last30, topPosts, dailyRows, subscribers] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 8,
      select: { slug: true, title: true, viewCount: true },
    }),
    prisma.pageView.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
  ]);

  // bucket by day in app code — avoids a raw SQL dependency for a small set
  const byDay = new Map<string, number>();
  for (const row of dailyRows as { createdAt: Date }[]) {
    const key = row.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), count: byDay.get(key) ?? 0 };
  });
  const peak = Math.max(1, ...days.map((d) => d.count));

  return (
    <AdminShell role={user.role} email={user.email} title="Analytics" subtitle="From your own page-view records">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Views, last 30 days", value: last30 },
          { label: "Views, all time", value: total },
          { label: "Confirmed subscribers", value: subscribers },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <div className="text-[12.5px] text-(--sub-text)">{s.label}</div>
            <div className="mt-2 text-3xl font-black">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <h2 className="mb-4 text-[15px] font-bold">Views — last 14 days</h2>
        {total === 0 ? (
          <p className="text-sm text-(--sub-text)">No views recorded yet. Counts start once pages are visited.</p>
        ) : (
          <>
            <div className="flex h-40 items-end gap-2">
              {days.map((d) => (
                <div key={d.label} className="flex-1" title={`${d.label}: ${d.count}`}>
                  <div className="rounded-t bg-(--primary)" style={{ height: `${Math.max(2, (d.count / peak) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2 text-[10.5px] text-(--sub-text)">
              {days.map((d, i) => <span key={d.label} className="flex-1 text-center">{i % 2 === 0 ? d.label : ""}</span>)}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-(--border-strong) bg-(--card-bg)">
        <div className="border-b border-(--border-strong) p-5"><h2 className="text-[15px] font-bold">Top posts</h2></div>
        {topPosts.length === 0 ? (
          <p className="p-5 text-sm text-(--sub-text)">No published posts yet.</p>
        ) : (
          topPosts.map((p: { slug: string; title: string; viewCount: number }) => (
            <div key={p.slug} className="flex items-center gap-4 border-b border-(--border-strong) px-5 py-3 last:border-0">
              <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
              <span className="text-sm font-bold">{p.viewCount.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
