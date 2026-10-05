import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const user = await requireRole(...can.sendCampaigns);

  const [campaigns, confirmed, pending, unsubscribed] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
    prisma.newsletterSubscriber.count({ where: { status: "PENDING" } }),
    prisma.newsletterSubscriber.count({ where: { status: "UNSUBSCRIBED" } }),
  ]);

  return (
    <AdminShell role={user.role} email={user.email} title="Newsletter" subtitle="Plan, schedule and review sends"
      actions={<Link href="/admin/newsletter/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">+ New campaign</Link>}>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Confirmed", value: confirmed },
          { label: "Pending opt-in", value: pending },
          { label: "Unsubscribed", value: unsubscribed },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <div className="text-[12.5px] text-(--sub-text)">{s.label}</div>
            <div className="mt-2 text-3xl font-black">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {campaigns.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No campaigns yet.</p>
        ) : (
          campaigns.map((c: { id: string; subject: string; audienceTag: string | null; status: string; scheduledAt: Date | null; sentAt: Date | null; recipients: number | null }) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/newsletter/${c.id}`} className="block truncate text-sm font-bold hover:text-(--primary)">{c.subject}</Link>
                <span className="text-xs text-(--sub-text)">
                  {c.audienceTag ? `Tag: ${c.audienceTag}` : "All confirmed subscribers"}
                  {c.recipients ? ` · ${c.recipients} sent` : ""}
                </span>
              </div>
              <span className="hidden text-xs text-(--sub-text) sm:block">
                {c.sentAt?.toLocaleDateString("en-GB") ?? c.scheduledAt?.toLocaleString("en-GB") ?? "—"}
              </span>
              <StatusPill status={c.status} />
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
