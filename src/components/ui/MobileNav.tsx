"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { NavItem } from "@/lib/nav";

/** Animated hamburger + slide-in drawer. Shared by every theme — the items are
 *  the same everywhere, only the desktop header styling differs per template. */
export function MobileNav({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onResize = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        aria-label={open ? "Close menu" : "Open menu"}
        className={`relative z-[70] h-11 w-11 lg:hidden ${open ? "invisible" : ""}`}
      >
        <span className={`absolute left-[11px] h-0.5 w-[22px] rounded bg-current transition-all duration-300 ${open ? "top-[21px] rotate-45" : "top-[14px]"}`} />
        <span className={`absolute left-[11px] top-[21px] h-0.5 rounded bg-current transition-all duration-200 ${open ? "w-0 opacity-0" : "w-[15px]"}`} />
        <span className={`absolute left-[11px] h-0.5 w-[22px] rounded bg-current transition-all duration-300 ${open ? "top-[21px] -rotate-45" : "top-[28px]"}`} />
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[70] bg-black/60 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden
      />
      <nav
        id="mobile-drawer"
        aria-label="Main menu"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-[80] flex h-[100dvh] w-[min(380px,88vw)] flex-col overflow-y-auto border-l border-(--border-strong) bg-(--header-bg) px-6 pb-7 pt-3 transition-transform duration-500 lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex justify-end">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="relative h-11 w-11">
            <span className="absolute left-[11px] top-[21px] h-0.5 w-[22px] rotate-45 rounded bg-current" />
            <span className="absolute left-[11px] top-[21px] h-0.5 w-[22px] -rotate-45 rounded bg-current" />
          </button>
        </div>
        <div className="flex flex-col">
          {nav.map((item) =>
            item.children?.length ? (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => (e === item.href ? null : item.href))}
                  aria-expanded={expanded === item.href}
                  className="flex min-h-[54px] w-full items-center justify-between border-b border-(--border-strong) text-[22px] font-extrabold"
                >
                  {item.label}
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" className={`transition-transform ${expanded === item.href ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <div className={`overflow-hidden transition-[max-height] duration-300 ${expanded === item.href ? "max-h-80" : "max-h-0"}`}>
                  {item.children.map((c) => (
                    <Link key={c.href} href={c.href as Route} onClick={() => setOpen(false)} className="block border-b border-(--border-strong) py-3 pl-4 text-[15px] font-semibold text-(--sub-text) hover:text-(--primary)">
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href as Route} onClick={() => setOpen(false)} className="flex min-h-[54px] items-center justify-between border-b border-(--border-strong) text-[22px] font-extrabold hover:text-(--primary)">
                {item.label}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
