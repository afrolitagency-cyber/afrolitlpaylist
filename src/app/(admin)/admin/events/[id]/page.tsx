import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { EventForm, type EventValues } from "@/components/admin/EventForm";
import { readSchedule } from "@/lib/events";

export const dynamic = "force-dynamic";

function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK: EventValues = {
  title: "", slug: "", description: "", startsAt: "", doorsAt: "", timezone: "Africa/Lagos",
  venue: "", address: "", country: "", city: "", eventType: "", ageLimit: "", schedule: "",
  seriesId: "", lineupArtistIds: [],
  registrationOpen: false, registrationUrl: "", ticketed: false, priceFrom: "",
  capacity: "", soldOut: false, status: "DRAFT", coverImage: "",
};

export default async function EventEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.manageContent);
  const isNew = id === "new";

  const [event, series, artists, regs] = await Promise.all([
    isNew ? null : prisma.event.findUnique({ where: { id }, include: { lineup: { select: { id: true } } } }),
    prisma.eventSeries.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.artist.findMany({ orderBy: { name: "asc" }, take: 300, select: { id: true, name: true } }),
    isNew
      ? []
      : prisma.eventRegistration.findMany({
          where: { eventId: id },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, name: true, email: true, optIn: true, waitlist: true, createdAt: true },
        }),
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
        city: event.city ?? "",
        eventType: event.eventType ?? "",
        ageLimit: event.ageLimit ?? "",
        schedule: readSchedule(event.schedule)
          .map((s) => [s.time, s.title, s.note].filter(Boolean).join(" | "))
          .join("\n"),
        seriesId: event.seriesId ?? "",
        lineupArtistIds: event.lineup.map((a: { id: string }) => a.id),
        registrationOpen: event.registrationOpen,
        registrationUrl: event.registrationUrl ?? "",
        ticketed: event.ticketed,
        priceFrom: event.priceFrom != null ? String(event.priceFrom) : "",
        capacity: event.capacity ? String(event.capacity) : "",
        soldOut: event.soldOut,
        status: event.status,
        coverImage: event.coverImage ?? "",
      }
    : BLANK;

  const waitlist = regs.filter((r) => r.waitlist);
  const registered = regs.filter((r) => !r.waitlist);

  return (
    <AdminShell role={user.role} email={user.email} title={isNew ? "New event" : "Edit event"} subtitle={event?.title ?? "Draft"}>
      <EventForm values={values} series={series} artists={artists} />

      {!isNew ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <RegList title={`Registered (${registered.length})`} rows={registered} />
          <RegList title={`Waitlist (${waitlist.length})`} rows={waitlist} />
        </div>
      ) : null}
    </AdminShell>
  );
}

function RegList({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string; email: string; optIn: boolean; createdAt: Date }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
      <h3 className="border-b border-(--border-strong) px-5 py-3 text-[15px] font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-(--sub-text)">None yet.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-strong) px-5 py-3 text-sm last:border-0">
              <span>
                <b className="block">{r.name}</b>
                <span className="text-xs text-(--sub-text)">{r.email}</span>
              </span>
              <span className="text-[11px] text-(--sub-text)">
                {r.optIn ? "Updates · " : ""}
                {r.createdAt.toLocaleDateString("en-GB")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
