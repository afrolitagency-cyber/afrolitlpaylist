import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";
import { formatKobo } from "@/lib/money";
import { ResendTicketButton } from "@/components/admin/ResendTicketButton";
import type { OrderStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED", "EXPIRED"];

function lagos(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-GB", { timeZone: "Africa/Lagos" });
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; status?: string; q?: string; from?: string; to?: string }>;
}) {
  const user = await requireRole(...can.manageContent);
  const sp = await searchParams;
  const eventId = sp.eventId || "";
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : "";
  const q = (sp.q ?? "").trim();
  const from = sp.from ? new Date(`${sp.from}T00:00:00+01:00`) : null;
  const to = sp.to ? new Date(`${sp.to}T23:59:59+01:00`) : null;

  const where: Prisma.OrderWhereInput = {
    ...(eventId ? { eventId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { buyerEmail: { contains: q, mode: "insensitive" } },
            { buyerName: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
            { buyerPhone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [events, orders, paid, refunded, failed, pending] = await Promise.all([
    prisma.event.findMany({
      where: { ticketed: true },
      orderBy: { startsAt: "desc" },
      take: 80,
      select: { id: true, title: true, startsAt: true },
    }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        event: { select: { title: true, slug: true } },
        items: { include: { tier: { select: { name: true } } } },
      },
    }),
    prisma.order.aggregate({ where: { ...where, status: "PAID" }, _sum: { totalKobo: true, feesKobo: true }, _count: true }),
    prisma.order.aggregate({ where: { ...where, status: "REFUNDED" }, _sum: { totalKobo: true }, _count: true }),
    prisma.order.count({ where: { ...where, status: "FAILED" } }),
    prisma.order.count({ where: { ...where, status: "PENDING" } }),
  ]);

  const qs = new URLSearchParams();
  if (eventId) qs.set("eventId", eventId);
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);
  const exportHref = `/admin/payments/export${qs.toString() ? `?${qs}` : ""}`;

  return (
    <AdminShell role={user.role} email={user.email} title="Ticket payments"
      subtitle="Paystack orders for AfroLit events"
      actions={<a href={exportHref} className="rounded border border-(--border-strong) px-4 py-2 text-sm font-bold">Export CSV</a>}>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Paid", value: `${paid._count} · ${formatKobo(paid._sum.totalKobo ?? 0)}` },
          { label: "Paystack fees (recorded)", value: formatKobo(paid._sum.feesKobo ?? 0) },
          { label: "Refunded", value: `${refunded._count} · ${formatKobo(refunded._sum.totalKobo ?? 0)}` },
          { label: "Failed / pending", value: `${failed} failed · ${pending} pending` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <div className="text-[12.5px] text-(--sub-text)">{s.label}</div>
            <div className="mt-2 text-lg font-black">{s.value}</div>
          </div>
        ))}
      </div>

      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-(--border-strong) bg-(--card-bg) p-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold" htmlFor="eventId">Event</label>
          <select id="eventId" name="eventId" defaultValue={eventId}
            className="rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm">
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}
            className="rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={sp.from ?? ""}
            className="rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={sp.to ?? ""}
            className="rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm" />
        </div>
        <div className="min-w-48 flex-1">
          <label className="mb-1.5 block text-xs font-bold" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, email, reference"
            className="w-full rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm" />
        </div>
        <button type="submit" className="rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-(--border-strong) bg-(--card-bg)">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-(--sub-text)">
              {["When", "Event", "Buyer", "Items", "Amount", "Status", "Reference"].map((h) => (
                <th key={h} className="border-b border-(--border-strong) px-4 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-(--sub-text)">No orders match.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-t border-(--border-strong)">
                <td className="px-4 py-3 text-xs">{lagos(o.paidAt ?? o.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${o.eventId}`} className="font-semibold hover:text-(--primary)">{o.event.title}</Link>
                </td>
                <td className="px-4 py-3">
                  <b className="block">{o.buyerName}</b>
                  <span className="text-xs text-(--sub-text)">{o.buyerEmail}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.items.map((i) => `${i.quantity}× ${i.tier.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 font-bold">{formatKobo(o.totalKobo)}</td>
                <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                <td className="px-4 py-3">
                  <Link href={`/events/${o.event.slug}/order/${o.reference}`} className="font-mono text-xs underline" target="_blank">
                    {o.reference}
                  </Link>
                  {o.status === "PAID" ? <ResendTicketButton reference={o.reference} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
