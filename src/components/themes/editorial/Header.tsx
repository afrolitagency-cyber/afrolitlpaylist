import Link from "next/link";
import { Brand } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import type { HeaderProps } from "../types";

export default function Header({ nav, identity }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] border-b border-(--border-strong) bg-(--header-bg) lg:static">
      <div className="wrap relative flex items-center justify-between gap-4 py-4 lg:flex-col lg:gap-2 lg:py-5">
        <Link href="/" className="flex items-center gap-2.5 lg:flex-col lg:gap-1.5">
          <Brand size={44} />
          <span className="hidden text-xs text-(--sub-text) lg:block">{identity.tagline}</span>
        </Link>
        <div className="flex items-center gap-2 lg:absolute lg:right-0 lg:top-5">
          <MobileNav nav={nav} />
        </div>
      </div>
      <nav aria-label="Main" className="hidden border-t border-(--border-strong) lg:block">
        <ul className="wrap flex h-[50px] items-center justify-center gap-7 text-[12.5px] font-bold uppercase tracking-wider">
          {nav.map((item) => (
            <li key={item.href} className="group relative">
              <Link href={item.href} className="py-2 text-(--sub-text) hover:text-(--body-text)">{item.label}</Link>
              {item.children?.length ? (
                <ul className="invisible absolute left-0 top-full z-40 min-w-56 border border-(--border-strong) border-t-2 border-t-(--primary) bg-(--surface) py-1.5 opacity-0 transition group-hover:visible group-hover:opacity-100">
                  {item.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href} className="block px-4 py-2.5 text-[13px] normal-case tracking-normal text-(--sub-text) hover:bg-(--surface-alt) hover:text-(--body-text)">{c.label}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
