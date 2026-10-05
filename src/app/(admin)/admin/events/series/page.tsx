import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { SeriesManager, type SeriesItem } from "@/components/admin/SeriesForm";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const user = await requireRole(...can.manageContent);

  const rows = await prisma.eventSeries.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: { select: { events: true } },
      events: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true } },
    },
  });

  const series: SeriesItem[] = rows.map((s: {
    id: string; name: string; slug: string; description: string | null; showInNav: boolean;
    _count: { events: number }; events: { startsAt: Date }[];
  }) => ({
    id: s.id, name: s.name, slug: s.slug, description: s.description ?? "", showInNav: s.showInNav,
    eventCount: s._count.events,
    nextDate: s.events[0]?.startsAt.toLocaleDateString("en-GB") ?? "—",
  }));

  return (
    <AdminShell role={user.role} email={user.email} title="Event series" subtitle="Group recurring programmes">
      <SeriesManager series={series} />
    </AdminShell>
  );
}
