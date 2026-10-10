"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChartAlbum } from "@/lib/albums";
import { AlbumCover, Movement } from "./AlbumCover";
import { ListenPicker } from "./ListenPicker";

const SLIDE_MS = 7000;

/** Homepage "Now Spinning": one album on stage, the chart beside it, auto-advancing. */
export function TrendingSpotlight({ albums }: { albums: ChartAlbum[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeIndex = Math.min(index, albums.length - 1);
  const current = albums[activeIndex];
  if (!current) return null;
  const halted = paused || menuOpen;
  const next = () => setIndex((i) => (i + 1) % albums.length);

  return (
    <section className="py-10" aria-labelledby="trending-albums-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--primary)">Now Spinning</p>
          <h2 id="trending-albums-title" className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight">Trending Albums</h2>
        </div>
        <Link href="/albums" className="rounded-full border border-(--border-strong) px-4.5 py-2.5 text-[12.5px] hover:border-(--primary) hover:text-(--primary)">
          View full chart →
        </Link>
      </div>

      <div
        className="grid gap-[clamp(20px,4vw,44px)] lg:grid-cols-[1fr_minmax(260px,350px)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="relative flex min-h-[clamp(320px,38vw,420px)] items-center overflow-visible rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,#141417,#0c0c0e)]">
          <div className="pointer-events-none absolute left-[-8%] top-[10%] aspect-square w-[55%] bg-[radial-gradient(circle,rgba(229,9,20,.2),transparent_65%)] blur-[20px]" />
          <div
            key={current.slug}
            className="relative flex w-full items-center gap-[clamp(18px,3vw,36px)] p-[clamp(20px,4vw,40px)] max-sm:flex-col max-sm:text-center"
            style={{ animation: "chart-in .6s cubic-bezier(.16,1,.3,1)" }}
          >
            <div className="relative aspect-square w-[clamp(130px,24vw,250px)] flex-none sm:mr-[clamp(26px,5vw,60px)] max-sm:w-[52%]">
              <div className="vinyl absolute right-[-20%] top-[4%] z-[1] aspect-square h-[92%] rounded-full shadow-[0_10px_30px_rgba(0,0,0,.6)] max-sm:hidden" />
              <div className="relative z-[2] h-full w-full overflow-hidden rounded-[22px] shadow-[0_30px_60px_-20px_#000]">
                <AlbumCover title={current.title} src={current.coverImage} sizes="250px" />
              </div>
            </div>

            <div className="relative z-[3] min-w-0 text-white">
              <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--primary)">
                #{activeIndex + 1} Trending <Movement value={current.movement} />
              </span>
              <h3 className="break-words text-[clamp(1.5rem,3.2vw,2.7rem)] font-bold leading-none tracking-tight">{current.title}</h3>
              <p className="mb-[18px] mt-2 text-white/60">
                {current.artistSlug ? (
                  <Link href={`/artists/${current.artistSlug}`} className="hover:text-(--primary)">{current.artistName}</Link>
                ) : current.artistName}
              </p>
              <div className="mb-[22px] flex flex-wrap gap-[clamp(14px,3vw,28px)] max-sm:justify-center">
                {[
                  { value: current.trackCount || "–", label: "Tracks" },
                  { value: current.releaseYear ?? "–", label: "Released" },
                  { value: current.genre ?? "–", label: "Genre" },
                ].map((s) => (
                  <div key={s.label} className="text-[11px] uppercase tracking-[0.08em] text-white/55">
                    <b className="mb-0.5 block text-[clamp(15px,2vw,19px)] font-bold normal-case tracking-normal text-white">{s.value}</b>
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 max-sm:justify-center">
                <ListenPicker slug={current.slug} platforms={current.platforms} onOpenChange={setMenuOpen} />
                <Link href={`/albums/${current.slug}`} className="rounded-full border border-white/20 px-4.5 py-3 text-[12.5px] hover:border-(--primary) hover:text-(--primary)">
                  View album →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <ol className="flex flex-col gap-2 max-lg:flex-row max-lg:overflow-x-auto max-lg:[scrollbar-width:none]">
          {albums.map((a, i) => {
            const on = i === activeIndex;
            return (
              <li key={a.slug} className="max-lg:flex-[0_0_220px]">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={on ? "true" : undefined}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border py-2.5 pl-3 pr-3.5 text-left ${
                    on ? "border-(--border-strong)/40 bg-(--card-bg)" : "border-transparent hover:bg-(--surface-alt) max-lg:border-(--border-strong)/40"
                  }`}
                >
                  <span className="w-5 text-[11px] font-medium text-(--sub-text)">{String(i + 1).padStart(2, "0")}</span>
                  <span className="relative size-[46px] flex-none overflow-hidden rounded-xl">
                    <AlbumCover title={a.title} src={a.coverImage} sizes="46px" label={false} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{a.title}</b>
                    <em className="text-xs not-italic text-(--sub-text)">{a.artistName}</em>
                  </span>
                  <Movement value={a.movement} />
                  {on && albums.length > 1 ? (
                    <i
                      key={`${a.slug}-${index}`}
                      className="absolute bottom-0 left-0 h-0.5 w-0 bg-(--primary)"
                      style={{
                        animation: `chart-fill ${SLIDE_MS}ms linear forwards`,
                        animationPlayState: halted ? "paused" : "running",
                      }}
                      onAnimationEnd={next}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-[18px] text-xs text-(--sub-text)">Ranked by our editors each week.</p>
    </section>
  );
}
