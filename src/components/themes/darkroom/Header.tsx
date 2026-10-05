import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import { DesktopNav } from "../shared";
import type { HeaderProps } from "../types";

export default function Header({ nav }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] border-b border-(--border-strong) bg-(--header-bg)">
      <div className="wrap flex h-[68px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={36} />
          <span className="text-[16px] font-black">
            AFRO<em className="not-italic text-(--primary)">LIT</em>
            <span className="font-normal">PLAYLIST</span>
          </span>
        </Link>
        <DesktopNav nav={nav} className="gap-6"
          linkClass="text-xs font-semibold text-(--sub-text) hover:text-(--body-text)" />
        <div className="flex items-center gap-2">
          <Link href="/search" aria-label="Search" className="hidden p-2 text-(--body-text) lg:block">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </Link>
          <MobileNav nav={nav} />
        </div>
      </div>
    </header>
  );
}
