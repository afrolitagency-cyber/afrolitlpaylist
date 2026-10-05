import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

export default async function AdminEvents() {
  const user = await requireRole(...can.manageContent);

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    take: 100,
    include: { series: { select: { name: true } }, lineup: { select: { name: true } }, _count: { select: { registrations: true } } },
  });

  const upcoming = events.filter((e: { startsAt: Date }) => e.startsAt.getTime() >= Date.now()).length;

  return (
    <AdminShell role={user.role} email={user.email} title="Events" subtitle="Shows, listings and registrations"
      actions={
        <>
          <Link href="/admin/events/series" className="rounded border border-(--border-strong) px-4 py-2 text-sm font-bold">Manage series</Link>
          <Link href="/admin/events/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">+ New event</Link>
        </>
      }>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Upcoming", value: upcoming },
          { label: "Total events", value: events.length },
          { label: "Registrations", value: events.reduce((n: number, e: { _count: { registrations: number } }) => n + e._count.registrations, 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <div className="text-[12.5px] text-(--sub-text)">{s.label}</div>
            <div className="mt-2 text-3xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No events yet.</p>
        ) : (
          events.map((e: {
            id: string; title: string; startsAt: Date; venue: string | null; status: string; soldOut: boolean;
            series: { name: string } | null; lineup: { name: string }[]; _count: { registrations: number };
          }) => (
            <div key={e.id} className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/events/${e.id}`} className="block truncate text-sm font-bold hover:text-(--primary)">{e.title}</Link>
                <span className="text-xs text-(--sub-text)">
                  {e.startsAt.toLocaleDateString("en-GB")} · {e.venue ?? "—"}
                  {e.series ? ` · ${e.series.name}` : ""}
                </span>
              </div>
              <span className="hidden text-xs text-(--sub-text) md:block">
                {e.soldOut ? "Sold out" : `${e._count.registrations} registered`}
              </span>
              <StatusPill status={e.status} />
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
