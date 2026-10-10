"use client";

import { useEffect, useRef, useState } from "react";

/** "Listen on…" menu. Each option goes through /go so the click is counted, then on to the app. */
export function ListenPicker({
  slug,
  platforms,
  onOpenChange,
}: {
  slug: string;
  platforms: { key: string; label: string }[];
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const notify = useRef(onOpenChange);
  notify.current = onOpenChange;

  useEffect(() => {
    notify.current?.(open);
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-(--primary) px-5 py-3 text-[13px] font-semibold text-white"
      >
        <svg viewBox="0 0 24 24" className="size-3 fill-current" aria-hidden><path d="M7 4l14 8-14 8z" /></svg>
        Listen on…
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-[210px] rounded-2xl border border-(--border-strong) bg-(--card-bg) p-1.5 shadow-[0_20px_40px_-10px_#000] max-sm:left-1/2 max-sm:-translate-x-1/2"
        >
          <small className="block px-3 pb-1 pt-1.5 text-[11px] text-(--sub-text)">Choose your music app</small>
          {platforms.map((p) => (
            <a
              key={p.key}
              role="menuitem"
              href={`/go/album/${slug}/${p.key}`}
              target="_blank"
              rel="nofollow noopener"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[13px] hover:bg-(--surface-alt)"
            >
              {p.label}
              <span aria-hidden>↗</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
