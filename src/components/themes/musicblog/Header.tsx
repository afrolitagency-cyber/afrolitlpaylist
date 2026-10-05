import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import { DesktopNav } from "../shared";
import type { HeaderProps } from "../types";

export default function Header({ nav }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] border-b border-(--border-strong) bg-(--header-bg)">
      <div className="wrap flex h-[76px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={40} />
          <span className="text-[18px] font-black">
            AFRO<em className="not-italic text-(--primary)">LIT</em>
            <span className="font-normal">PLAYLIST</span>
          </span>
        </Link>
        <DesktopNav nav={nav} className="gap-6"
          linkClass="text-[12.5px] font-extrabold uppercase tracking-wider text-(--sub-text) hover:text-(--primary)" />
        <div className="flex items-center gap-2">
          <MobileNav nav={nav} />
        </div>
      </div>
    </header>
  );
}
