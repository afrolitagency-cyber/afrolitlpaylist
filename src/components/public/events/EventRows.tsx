import Link from "next/link";
import type { EventCard } from "@/lib/events";

/** Compact upcoming-events list under the slider. */
export function EventRows({ events, excludeSlug }: { events: EventCard[]; excludeSlug?: string }) {
  const rows = excludeSlug ? events.filter((e) => e.slug !== excludeSlug) : events;
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((e) => (
        <Link
          key={e.id}
          href={`/events/${e.slug}`}
          className="group grid grid-cols-[62px_minmax(0,1fr)_auto_32px] items-center gap-3.5 rounded-[20px] border border-white/10 px-3.5 py-3 transition hover:translate-x-1 hover:border-[#3a2226] hover:bg-[#121215] max-sm:grid-cols-[54px_minmax(0,1fr)_32px]"
        >
          <span className="rounded-[14px] bg-white py-2 text-center leading-none text-black">
            <b className="block text-[21px] font-bold">{e.day}</b>
            <span className="text-[10px] font-semibold tracking-[0.14em]">{e.month}</span>
          </span>
          <span className="min-w-0">
            <b className="block truncate text-[14.5px]">{e.title}</b>
            <em className="not-italic text-xs text-(--sub-text)">
              {[e.venue, e.city].filter(Boolean).join(", ") || "Venue TBC"}
            </em>
          </span>
          <span className={`rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] max-sm:hidden ${e.status === "out" ? "text-(--sub-text)" : ""}`}>
            {e.tag}
          </span>
          <span className="grid size-8 place-items-center rounded-full border border-white/20 text-sm transition group-hover:border-(--primary) group-hover:bg-(--primary) group-hover:text-black">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
