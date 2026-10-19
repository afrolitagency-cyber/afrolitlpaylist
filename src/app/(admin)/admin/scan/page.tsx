import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { ScanDesk } from "@/components/admin/ScanDesk";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; q?: string }>;
}) {
  const user = await requireRole(...can.scanDoor);
  const sp = await searchParams;
  const events = await prisma.event.findMany({
    where: { ticketed: true, status: "PUBLISHED" },
    orderBy: { startsAt: "desc" },
    take: 40,
    select: { id: true, title: true, startsAt: true },
  });
  const eventId = sp.eventId || events[0]?.id || "";
  const q = (sp.q ?? "").trim();

  const sold = eventId ? await prisma.ticket.count({ where: { eventId, voidedAt: null } }) : 0;
  const checkedIn = eventId ? await prisma.ticket.count({ where: { eventId, voidedAt: null, usedAt: { not: null } } }) : 0;
  const compsIssued = eventId ? await prisma.ticket.count({ where: { eventId, voidedAt: null, tier: { isComp: true } } }) : 0;
  const compsIn = eventId
    ? await prisma.ticket.count({ where: { eventId, voidedAt: null, tier: { isComp: true }, usedAt: { not: null } } })
    : 0;
  const hits = eventId && q
    ? await prisma.ticket.findMany({
        where: {
          eventId,
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { holderName: { contains: q, mode: "insensitive" } },
            { order: { buyerEmail: { contains: q, mode: "insensitive" } } },
            { order: { buyerName: { contains: q, mode: "insensitive" } } },
            { order: { reference: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 40,
        include: {
          tier: { select: { name: true, isComp: true } },
          order: { select: { buyerEmail: true, reference: true } },
        },
      })
    : [];

  return (
    <AdminShell role={user.role} email={user.email} title="Door scan"
      subtitle="Atomic check-in. Three failure reasons. Lookup when the phone is dead.">
      {!events.length ? (
        <p className="text-sm text-(--sub-text)">No ticketed published events yet.</p>
      ) : (
        <ScanDesk
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            startsAt: e.startsAt.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" }),
          }))}
          eventId={eventId}
          tracker={{
            sold,
            checkedIn,
            remaining: Math.max(0, sold - checkedIn),
            compsIssued,
            compsIn,
          }}
          query={q}
          hits={hits.map((t) => ({
            id: t.id,
            code: t.code,
            holderName: t.holderName ?? "",
            tier: t.tier.name,
            isComp: t.tier.isComp,
            usedAt: t.usedAt
              ? t.usedAt.toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })
              : null,
            voided: Boolean(t.voidedAt),
            email: t.order?.buyerEmail ?? "",
            reference: t.order?.reference ?? null,
          }))}
        />
      )}
    </AdminShell>
  );
}
