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
  const pending = events.filter((e: { status: string }) => e.status === "PENDING");
  const unpublish = events.filter((e: { status: string; unpublishNote: string | null }) => e.status === "PUBLISHED" && e.unpublishNote);
  const rest = events.filter((e: { status: string; unpublishNote: string | null }) => e.status !== "PENDING" && !(e.status === "PUBLISHED" && e.unpublishNote));

  return (
    <AdminShell role={user.role} email={user.email} title="Events" subtitle="Shows, listings and registrations"
      actions={
        <>
          <Link href="/admin/events/series" className="rounded border border-(--border-strong) px-4 py-2 text-sm font-bold">Manage series</Link>
          <Link href="/admin/events/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">+ New event</Link>
        </>
      }>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Waiting for approval", value: pending.length },
          { label: "Asked to come off", value: unpublish.length },
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

      {pending.length > 0 ? (
        <div className="mb-5 overflow-hidden rounded-xl border border-amber-500/40 bg-(--card-bg)">
          <h2 className="border-b border-(--border-strong) px-5 py-3 text-sm font-bold">Waiting for approval</h2>
          {pending.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      ) : null}

      {unpublish.length > 0 ? (
        <div className="mb-5 overflow-hidden rounded-xl border border-amber-500/40 bg-(--card-bg)">
          <h2 className="border-b border-(--border-strong) px-5 py-3 text-sm font-bold">Asked to come off the site</h2>
          {unpublish.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {rest.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">{events.length === 0 ? "No events yet." : "Nothing else in the list."}</p>
        ) : (
          rest.map((e) => <EventRow key={e.id} event={e} />)
        )}
      </div>
    </AdminShell>
  );
}

function EventRow({
  event,
}: {
  event: {
    id: string;
    title: string;
    startsAt: Date;
    venue: string | null;
    status: string;
    soldOut: boolean;
    reviewNote: string | null;
    unpublishNote: string | null;
    series: { name: string } | null;
    _count: { registrations: number };
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/events/${event.id}`} className="block truncate text-sm font-bold hover:text-(--primary)">{event.title}</Link>
        <span className="text-xs text-(--sub-text)">
          {event.startsAt.toLocaleDateString("en-GB")} · {event.venue ?? "—"}
          {event.series ? ` · ${event.series.name}` : ""}
          {event.reviewNote ? " · sent back" : ""}
          {event.unpublishNote ? " · asked to come off" : ""}
        </span>
      </div>
      <span className="hidden text-xs text-(--sub-text) md:block">
        {event.soldOut ? "Sold out" : `${event._count.registrations} registered`}
      </span>
      <StatusPill status={event.status} />
    </div>
  );
}
