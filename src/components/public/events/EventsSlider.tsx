"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EventCard } from "@/lib/events";
import { naira } from "@/lib/events";
import { EventCover } from "./EventCover";

const SLIDE_MS = 6500;

function TitleWords({ title }: { title: string }) {
  return (
    <>
      {title.split(" ").map((word, i) => (
        <span key={`${i}-${word}`} className="inline-block overflow-hidden align-top pb-[0.08em]">
          <span
            className="event-word inline-block translate-y-[110%]"
            style={{ ["--i" as string]: i }}
          >
            {word}&nbsp;
          </span>
        </span>
      ))}
    </>
  );
}

function statusChip(status: EventCard["status"]) {
  if (status === "few") return "border-(--primary)/50 text-(--primary)";
  if (status === "out") return "text-(--sub-text)";
  return "";
}

/** Full-bleed event carousel from the events template. */
export function EventsSlider({
  events,
  mode = "home",
}: {
  events: EventCard[];
  /** home = multi-slide carousel; detail = single static hero */
  mode?: "home" | "detail";
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prevRef = useRef(-1);

  useEffect(() => {
    prevRef.current = -1;
    setIndex(0);
  }, [events]);

  if (events.length === 0) return null;

  const go = (i: number) => {
    const next = ((i % events.length) + events.length) % events.length;
    prevRef.current = index;
    setIndex(next);
  };

  const isDetail = mode === "detail";

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-black ${
        isDetail ? "h-[clamp(420px,62vh,540px)]" : "h-[clamp(500px,74vh,660px)] max-sm:h-[clamp(520px,82vh,640px)]"
      }`}
      aria-roledescription="carousel"
      aria-label="Upcoming events"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {events.map((e, i) => {
        const on = i === index;
        const was = i === prevRef.current;
        return (
          <article
            key={e.id}
            className={`absolute inset-0 ${on ? "event-slide-on z-[2]" : was ? "z-[1] visible" : "invisible"}`}
            aria-hidden={!on}
          >
            <div className={`absolute inset-0 overflow-hidden ${on ? "event-ken" : ""}`}>
              <EventCover src={e.coverImage} pattern={e.pattern} priority={i === 0} />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg,rgba(10,10,12,.94) 0,rgba(10,10,12,.6) 52%,rgba(10,10,12,.1)),linear-gradient(0deg,rgba(10,10,12,.85),transparent 40%)",
              }}
            />

            <div
              className={`absolute left-[clamp(22px,5vw,64px)] right-[clamp(22px,5vw,64px)] z-[3] flex max-w-[680px] flex-col gap-4 ${
                isDetail
                  ? "top-1/2 -translate-y-[54%] max-sm:bottom-7 max-sm:top-auto max-sm:translate-y-0"
                  : "top-1/2 -translate-y-[54%] max-sm:bottom-[78px] max-sm:top-auto max-sm:translate-y-0"
              }`}
            >
              <div className={`flex flex-wrap items-center gap-2.5 ${on ? "event-up" : ""}`} style={{ ["--d" as string]: ".35s" }}>
                <span className={`rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm ${statusChip(e.status)}`}>
                  {e.statusLabel}
                </span>
                <span className="text-xs uppercase tracking-[0.1em] text-white/60">
                  {[e.eventType, e.city].filter(Boolean).join(" · ") || "Event"}
                </span>
              </div>

              <h2 className="text-[clamp(2.2rem,6.4vw,5rem)] font-bold leading-[0.96] tracking-[-0.035em] text-white">
                {on ? <TitleWords title={e.title} /> : e.title}
              </h2>

              {e.lineup.length ? (
                <p className={`text-[clamp(14px,1.8vw,17px)] text-[#d8d8dc] ${on ? "event-up" : ""}`} style={{ ["--d" as string]: ".6s" }}>
                  {e.lineup.join(" · ")}
                </p>
              ) : null}

              <div className={`flex flex-wrap gap-x-[22px] gap-y-2 text-[13.5px] text-white/60 ${on ? "event-up" : ""}`} style={{ ["--d" as string]: ".68s" }}>
                <span><b className="font-medium text-white">{e.dateLabel}</b></span>
                <span>{e.timeLabel}</span>
                {e.venue ? <span>{e.venue}</span> : null}
                {isDetail ? (
                  <span>Starts in <b className="font-medium text-white">{e.daysLeft} days</b></span>
                ) : null}
              </div>

              <div className={`mt-1.5 flex flex-wrap items-center gap-5 ${on ? "event-up" : ""}`} style={{ ["--d" as string]: ".76s" }}>
                {isDetail ? (
                  <a
                    href="#attend"
                    className="inline-flex items-center gap-2 rounded-full bg-(--primary) px-[26px] py-[13px] text-[13.5px] font-semibold text-white transition hover:scale-[1.04]"
                  >
                    {e.ctaLabel}
                  </a>
                ) : (
                  <Link
                    href={`/events/${e.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-(--primary) px-[26px] py-[13px] text-[13.5px] font-semibold text-white transition hover:scale-[1.04]"
                  >
                    {e.ctaLabel}
                  </Link>
                )}
                <span className="text-xs uppercase tracking-[0.08em] text-white/60">
                  {e.ticketed ? (
                    <>From <b className="mt-0.5 block text-[20px] font-bold tracking-normal text-white">{e.priceFrom ? naira(e.priceFrom) : "—"}</b></>
                  ) : (
                    <>Entry <b className="mt-0.5 block text-[20px] font-bold tracking-normal text-white">Free</b></>
                  )}
                </span>
              </div>
            </div>

            <div className={`pointer-events-none absolute right-[clamp(22px,5vw,64px)] top-1/2 z-[3] hidden -translate-y-[58%] flex-col text-center leading-[0.85] sm:flex ${on ? "event-up" : ""}`} style={{ ["--d" as string]: ".5s" }}>
              <b className="text-[clamp(5rem,13vw,10rem)] font-bold tracking-[-0.04em] text-transparent [-webkit-text-stroke:2px_rgba(246,245,242,.7)]">
                {e.day}
              </b>
              <span className="mr-[-0.5em] text-[clamp(1rem,2.2vw,1.7rem)] font-semibold tracking-[0.5em] text-(--primary)">
                {e.month}
              </span>
            </div>
          </article>
        );
      })}

      {!isDetail && events.length > 1 ? (
        <div className="absolute inset-x-[clamp(22px,5vw,64px)] bottom-6 z-[5] flex items-center gap-4">
          <div className="flex flex-1 gap-2">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                aria-label={`Go to ${e.title}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
                className="flex h-[22px] flex-1 items-center bg-transparent"
              >
                <span className="block h-[3px] w-full overflow-hidden rounded-sm bg-white/20">
                  {i < index ? <i className="block h-full w-full bg-(--primary)" /> : null}
                  {i === index ? (
                    <i
                      key={`${e.slug}-${index}`}
                      className="block h-full w-0 bg-(--primary)"
                      style={{
                        animation: `chart-fill ${SLIDE_MS}ms linear forwards`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                      onAnimationEnd={() => go(index + 1)}
                    />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <div className="whitespace-nowrap text-xs font-medium tracking-[0.1em] text-white/60">
            <b className="text-white">{String(index + 1).padStart(2, "0")}</b>
            {" / "}
            {String(events.length).padStart(2, "0")}
          </div>
          <button
            type="button"
            aria-label="Previous event"
            onClick={() => go(index - 1)}
            className="hidden size-[42px] items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg backdrop-blur-sm hover:border-(--primary) hover:text-(--primary) sm:grid"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next event"
            onClick={() => go(index + 1)}
            className="hidden size-[42px] items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg backdrop-blur-sm hover:border-(--primary) hover:text-(--primary) sm:grid"
          >
            ›
          </button>
        </div>
      ) : null}
    </section>
  );
}
