"use client";
import { useEffect, useState } from "react";

type Mode = "dark" | "light";

/** Appearance only — unrelated to the five layout templates. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("appearance") as Mode | null) ?? null;
    const initial: Mode =
      stored ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    apply(initial);
    setMode(initial);
  }, []);

  function apply(next: Mode) {
    document.documentElement.dataset.appearance = next;
    try {
      localStorage.setItem("appearance", next);
    } catch {
      /* private mode — appearance just won't persist */
    }
  }

  function toggle(next: Mode) {
    setMode(next);
    apply(next);
  }

  return (
    <div className="flex gap-1 rounded-full border border-(--border-strong) bg-(--card-bg) p-[3px]" role="group" aria-label="Appearance">
      {(["dark", "light"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => toggle(m)}
          aria-pressed={mode === m}
          aria-label={`${m} mode`}
          className={`grid h-[30px] w-[30px] place-items-center rounded-full ${
            mode === m ? "bg-(--primary) text-white" : "text-(--sub-text)"
          }`}
        >
          {m === "dark" ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.3 0-.6-.05-.9A6.5 6.5 0 0 1 12 3z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          )}
        </button>
      ))}
    </div>
  );
}
