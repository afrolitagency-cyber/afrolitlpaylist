"use client";

import { useEffect, useRef } from "react";

/** Counts a view only when half the slot has been on screen for one second. */
export function AdImpression({ id, trackerUrl }: { id: string; trackerUrl?: string | null }) {
  const sent = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || sent.current) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = setTimeout(() => {
            if (sent.current) return;
            sent.current = true;
            io.disconnect();
            const body = JSON.stringify({ id });
            navigator.sendBeacon?.("/api/ads/impression", new Blob([body], { type: "application/json" }));
            if (trackerUrl) {
              const pixel = new Image();
              pixel.src = trackerUrl;
            }
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [id, trackerUrl]);

  return <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}
