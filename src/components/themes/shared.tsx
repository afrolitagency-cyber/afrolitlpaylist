import Link from "next/link";
import type { NavItem } from "@/lib/nav";

/** Desktop nav shared by the row-layout themes. Items are identical across
 *  templates by design — only the styling differs. */
export function DesktopNav({ nav, className = "", linkClass = "" }: { nav: NavItem[]; className?: string; linkClass?: string }) {
  return (
    <nav aria-label="Main" className={`hidden lg:flex ${className}`}>
      {nav.map((item) => (
        <div key={item.href} className="group relative">
          <Link href={item.href} className={linkClass}>{item.label}</Link>
          {item.children?.length ? (
            <ul className="invisible absolute left-0 top-full z-40 min-w-56 border border-(--border-strong) border-t-2 border-t-(--primary) bg-(--surface) py-1.5 opacity-0 transition group-hover:visible group-hover:opacity-100">
              {item.children.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="block px-4 py-2.5 text-[13px] font-normal normal-case tracking-normal text-(--sub-text) hover:bg-(--surface-alt) hover:text-(--body-text)">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

export function LiveClock() {
  return (
    <span className="hidden items-center gap-3 text-[12.5px] text-white/70 xl:flex">
      <span suppressHydrationWarning>
        {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </span>
    </span>
  );
}
