"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { NowPlaying } from "@/lib/widgets";

export function NowPlayingWidget({ track }: { track: NonNullable<NowPlaying> }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // streaming links (Spotify etc.) can't be played inline — link out instead
  const playable = Boolean(track.audioUrl && !/spotify\.com|music\.apple\.com|youtube\.com/.test(track.audioUrl));

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
    setPlaying(!playing);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded bg-(--surface)">
          {track.image ? <Image src={track.image} alt="" fill sizes="56px" className="object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-(--sub-text)">
            <span className="flex h-2.5 items-end gap-0.5" aria-hidden>
              {[0, 1, 2].map((b) => (
                <i key={b} className="w-0.5 animate-pulse bg-(--primary)" style={{ height: `${4 + b * 3}px`, animationDelay: `${b * 0.2}s` }} />
              ))}
            </span>
            On air
          </span>
          <h4 className="mt-0.5 truncate text-sm font-bold">{track.title}</h4>
          {track.artistSlug ? (
            <Link href={`/artists/${track.artistSlug}`} className="text-xs text-(--sub-text) hover:text-(--primary)">{track.artist}</Link>
          ) : (
            <span className="text-xs text-(--sub-text)">{track.artist}</span>
          )}
        </div>
      </div>

      {playable && track.audioUrl ? (
        <>
          <audio ref={audioRef} src={track.audioUrl} preload="none"
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
            }}
            onEnded={() => setPlaying(false)}>
            <track kind="captions" />
          </audio>
          <div className="mt-3.5 h-[3px] overflow-hidden rounded bg-(--border-strong)">
            <div className="h-full bg-(--primary) transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex justify-center">
            <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}
              className="grid size-11 place-items-center rounded-full bg-(--primary) text-white">
              {playing ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          </div>
        </>
      ) : track.audioUrl ? (
        <a href={track.audioUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3.5 block rounded bg-(--primary) py-2.5 text-center text-sm font-semibold text-white">
          Listen now
        </a>
      ) : null}
    </div>
  );
}
