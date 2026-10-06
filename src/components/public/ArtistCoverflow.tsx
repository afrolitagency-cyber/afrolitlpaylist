"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type CoverArtist = {
  slug: string;
  name: string;
  genre: string | null;
  image: string | null;
};

const SAMPLES: CoverArtist[] = [
  { slug: "", name: "Kessy Vane", genre: "Afrobeats", image: null },
  { slug: "", name: "NOVA Sol", genre: "Amapiano", image: null },
  { slug: "", name: "Dàmilare", genre: "Afro-Soul", image: null },
  { slug: "", name: "Lagoon Boy", genre: "Street Pop", image: null },
  { slug: "", name: "Mirèio", genre: "Afro-Fusion", image: null },
  { slug: "", name: "Chike Nova", genre: "R&B", image: null },
  { slug: "", name: "Sade Row", genre: "Alté", image: null },
  { slug: "", name: "Témi Blaze", genre: "Afrobeats", image: null },
];

function place(index: number, active: number, count: number, offset: number) {
  let diff = index - active;
  if (diff > count / 2) diff -= count;
  if (diff < -count / 2) diff += count;
  const abs = Math.abs(diff);
  const scale = abs === 0 ? 1 : Math.max(0.55, 1 - abs * 0.22);
  return {
    active: diff === 0,
    transform: `translate(-50%, -50%) translateX(${diff * 150 + offset}px) scale(${scale})`,
    opacity: abs > 3 ? 0 : 1 - abs * 0.22,
    zIndex: 100 - abs,
    filter: abs === 0 ? "none" : `brightness(${1 - abs * 0.12})`,
  };
}

/** Concept 03 from public/artists-section-concepts.html: circular covers in a turning row. */
export function ArtistCoverflow({ artists }: { artists: CoverArtist[] }) {
  const shown = artists.length > 0 ? artists : SAMPLES;
  const preview = artists.length === 0;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const ignoreClick = useRef(false);
  const count = shown.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % count), 3200);
    return () => window.clearInterval(id);
  }, [count, paused]);

  const current = shown[active] ?? shown[0];
  if (!current) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (count < 2) return;
    drag.current = { x: event.clientX, moved: false };
    setDragging(true);
    setPaused(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is unavailable for this pointer; move events still bubble */
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    if (Math.abs(dx) > 8) drag.current.moved = true;
    setOffset(dx);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const moved = drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (event.pointerType === "touch") setPaused(false);
    if (!moved) {
      setOffset(0);
      return;
    }
    ignoreClick.current = true;
    const steps = Math.round(-dx / 150);
    const remainder = dx + steps * 150;
    if (steps !== 0) setActive((i) => (i + steps + count * 8) % count);
    setOffset(remainder);
    requestAnimationFrame(() => setOffset(0));
  };

  return (
    <section className="pb-4 pt-10" aria-label="Featured artists">
      <div className="mb-2 text-center">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--primary)">Spotlight</p>
        <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold tracking-tight">Featured Artists</h2>
      </div>

      <div
        className="relative mx-auto h-[340px] cursor-grab touch-pan-y overflow-hidden [perspective:1500px] [transform:translateZ(0)] active:cursor-grabbing sm:h-[420px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          if (!drag.current) setPaused(false);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="absolute left-1/2 top-1/2 h-0 w-0">
          {shown.map((artist, index) => {
            const spot = place(index, active, count, offset);
            return (
              <button
                key={`${artist.slug}-${artist.name}`}
                type="button"
                aria-label={artist.name}
                draggable={false}
                onClick={() => {
                  if (ignoreClick.current) {
                    ignoreClick.current = false;
                    return;
                  }
                  setActive(index);
                }}
                className="absolute left-0 top-0 h-[190px] w-[190px] cursor-grab rounded-full border-0 bg-transparent p-0 active:cursor-grabbing"
                style={{
                  transform: spot.transform,
                  opacity: spot.opacity,
                  zIndex: spot.zIndex,
                  filter: spot.filter,
                  pointerEvents: spot.opacity === 0 ? "none" : "auto",
                  transition: dragging ? "none" : "transform .45s cubic-bezier(.16,1,.3,1), opacity .35s ease, filter .35s ease",
                }}
              >
                <span
                  className={`pointer-events-none absolute -inset-2 rounded-full border-2 border-(--primary) ${spot.active ? "opacity-100" : "opacity-0"}`}
                  style={spot.active ? { animation: "coverflow-pulse 2.2s ease-out infinite" } : undefined}
                />
                <span className="relative block h-full w-full overflow-hidden rounded-full bg-black">
                  {artist.image ? (
                    <img src={artist.image} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-[linear-gradient(145deg,#2a1014_0%,#0a0a0c_55%,#7a1420_130%)] text-5xl font-bold text-white/20">
                      {artist.name.charAt(0)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1 text-center">
        {preview || !current.slug ? (
          <p className="text-[19px] font-bold">{current.name}</p>
        ) : (
          <Link href={`/artists/${current.slug}`} className="text-[19px] font-bold hover:text-(--primary)">
            {current.name}
          </Link>
        )}
        {current.genre ? (
          <p className="mt-0.5 text-[11.5px] uppercase tracking-[0.08em] text-(--primary)">{current.genre}</p>
        ) : null}
      </div>

      <div className="mt-5 flex justify-center gap-[7px]">
        {shown.map((artist, index) => (
          <button
            key={`${artist.slug}-${artist.name}`}
            type="button"
            aria-label={`Show ${artist.name}`}
            onClick={() => setActive(index)}
            className={`h-[7px] rounded-full transition-all ${index === active ? "w-5 bg-(--primary)" : "w-[7px] bg-(--border-strong)"}`}
          />
        ))}
      </div>
    </section>
  );
}
