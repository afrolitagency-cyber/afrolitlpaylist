"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { EventItem } from "@/lib/widgets";

/** The numbered-dot carousel from the templates: auto-advance, dot jump, swipe. */
export function EventsCarousel({ events }: { events: EventItem[] }) {
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useRef<number | null>(null);
  const n = events.length;

  useEffect(() => {
    if (n < 2) return;
    timer.current = setInterval(() => setI((v) => (v + 1) % n), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [n]);

  function go(next: number) {
    setI(((next % n) + n) % n);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setI((v) => (v + 1) % n), 5000);
  }

  if (n === 0) return null;

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-lg"
        onTouchStart={(e) => (start.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (start.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - start.current;
          start.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
        }}
      >
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
          {events.map((e) => (
            <Link key={e.slug} href={`/events/${e.slug}`} className="relative block min-w-full">
              <div className="relative h-[200px] bg-(--surface)">
                {e.image ? <Image src={e.image} alt="" fill sizes="320px" className="object-cover" /> : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3.5">
                <span className="text-xs font-bold text-white/80">{e.date} · {e.venue}</span>
                <h4 className="mt-0.5 text-[15px] font-bold text-white">{e.title}</h4>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {n > 1 ? (
        <div className="mt-3 flex justify-center gap-2">
          {events.map((e, k) => (
            <button key={e.slug} type="button" onClick={() => go(k)} aria-label={`Event ${k + 1}`}
              aria-current={k === i} className={`size-[30px] rounded-full border text-xs font-bold ${k === i ? "border-(--primary) bg-(--primary) text-white" : "border-(--border) text-(--sub-text)"}`}>
              {k + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
