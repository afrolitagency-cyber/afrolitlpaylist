import Link from "next/link";
import Image from "next/image";
import { getTrending, getUpcomingEvents, getNowPlaying, getListenLinks } from "@/lib/widgets";
import { EventsCarousel } from "./EventsCarousel";
import { NowPlayingWidget } from "./NowPlayingWidget";
import { NewsletterSignup } from "@/components/public/NewsletterSignup";

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-(--card-bg) p-5">
      <h3 className="mb-3.5 text-base font-extrabold">{title}</h3>
      {children}
    </section>
  );
}

const SERVICE = {
  spotify: { bg: "bg-[#1DB954]", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" },
  youtube: { bg: "bg-[#FF0000]", icon: "M10 15.3V8.7l6 3.3-6 3.3z" },
} as const;

/** The widget rail shared by every template. Each widget hides itself when it
 *  has no data, so a new site shows a clean column rather than empty boxes. */
export async function WidgetSidebar() {
  const [trending, events, nowPlaying, listen] = await Promise.all([
    getTrending(),
    getUpcomingEvents(),
    getNowPlaying(),
    getListenLinks(),
  ]);

  return (
    <aside className="flex flex-col gap-5">
      <Widget title="Search">
        <form action="/search" className="flex overflow-hidden rounded border border-(--border) bg-(--input-bg)">
          <input name="q" placeholder="Artists, posts, episodes" aria-label="Search"
            className="min-w-0 flex-1 bg-transparent p-3 text-sm outline-none" />
          <button type="submit" aria-label="Search" className="bg-(--primary) px-4 text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>
      </Widget>

      {trending.length > 0 ? (
        <Widget title="Trending now">
          {trending.map((t) => (
            <Link key={t.href} href={t.href} className="flex items-center gap-3.5 border-b border-(--border-strong) py-2.5 last:border-0">
              <span className="w-8 shrink-0 text-center text-4xl font-black leading-none text-(--card-bg) [-webkit-text-stroke:2px_var(--border)]">
                {t.rank}
              </span>
              <div className="relative size-12 shrink-0 overflow-hidden rounded bg-(--surface)">
                {t.image ? <Image src={t.image} alt="" fill sizes="48px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold">{t.title}</h4>
                <span className="text-xs text-(--sub-text)">{t.sub}</span>
              </div>
            </Link>
          ))}
        </Widget>
      ) : null}

      {events.length > 0 ? (
        <Widget title="Upcoming events"><EventsCarousel events={events} /></Widget>
      ) : null}

      {nowPlaying ? (
        <Widget title="Now playing"><NowPlayingWidget track={nowPlaying} /></Widget>
      ) : null}

      {listen.length > 0 ? (
        <Widget title="Listen on">
          {listen.map((l) => (
            <a key={l.service} href={l.href} target="_blank" rel="noopener noreferrer"
              className="mb-2.5 flex items-center gap-3 rounded-lg border border-(--border-strong) bg-(--input-bg) p-3.5 last:mb-0">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-white ${SERVICE[l.service].bg}`}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d={SERVICE[l.service].icon} /></svg>
              </span>
              <span className="min-w-0">
                <b className="block truncate text-sm">{l.label}</b>
                <span className="text-xs text-(--sub-text)">{l.sub}</span>
              </span>
            </a>
          ))}
        </Widget>
      ) : null}

      <Widget title="Newsletter"><NewsletterSignup compact /></Widget>
    </aside>
  );
}
