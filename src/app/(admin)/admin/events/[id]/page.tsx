import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { EventForm, type EventValues } from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK: EventValues = {
  title: "", slug: "", description: "", startsAt: "", doorsAt: "", timezone: "Africa/Lagos",
  venue: "", address: "", country: "", seriesId: "", lineupArtistIds: [],
  registrationOpen: false, registrationUrl: "", capacity: "", soldOut: false,
  status: "DRAFT", coverImage: "",
};

export default async function EventEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.manageContent);
  const isNew = id === "new";

  const [event, series, artists] = await Promise.all([
    isNew ? null : prisma.event.findUnique({ where: { id }, include: { lineup: { select: { id: true } } } }),
    prisma.eventSeries.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.artist.findMany({ orderBy: { name: "asc" }, take: 300, select: { id: true, name: true } }),
  ]);

  if (!isNew && !event) notFound();

  const values: EventValues = event
    ? {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description ?? "",
        startsAt: forInput(event.startsAt),
        doorsAt: forInput(event.doorsAt),
        timezone: event.timezone,
        venue: event.venue ?? "",
        address: event.address ?? "",
        country: event.country ?? "",
        seriesId: event.seriesId ?? "",
        lineupArtistIds: event.lineup.map((a: { id: string }) => a.id),
        registrationOpen: event.registrationOpen,
        registrationUrl: event.registrationUrl ?? "",
        capacity: event.capacity ? String(event.capacity) : "",
        soldOut: event.soldOut,
        status: event.status,
        coverImage: event.coverImage ?? "",
      }
    : BLANK;

  return (
    <AdminShell role={user.role} email={user.email} title={isNew ? "New event" : "Edit event"} subtitle={event?.title ?? "Draft"}>
      <EventForm values={values} series={series} artists={artists} />
    </AdminShell>
  );
}
