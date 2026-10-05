import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import { DesktopNav } from "../shared";
import type { HeaderProps } from "../types";

const COUNTRIES = "Nigeria · Ghana · South Africa · Kenya · Tanzania";

export default function Header({ nav, identity }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60]">
      <div className="hidden bg-black sm:block">
        <div className="wrap flex h-[34px] items-center justify-between text-xs text-white/60">
          <span>{COUNTRIES}</span>
          <span className="flex gap-3">
            {Object.entries(identity.socials).map(([k, v]) => (
              <a key={k} href={v} className="capitalize hover:text-white">{k.slice(0, 2).toUpperCase()}</a>
            ))}
          </span>
        </div>
      </div>

      <div className="border-b border-(--border-strong) bg-(--header-bg)">
        <div className="wrap flex h-[76px] items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <span className="text-[18px] font-black">
              AFRO<em className="not-italic text-(--primary)">LIT</em>
              <span className="font-normal">PLAYLIST</span>
            </span>
          </Link>
          <DesktopNav nav={nav} className="gap-6"
            linkClass="text-[13px] font-bold uppercase tracking-wide text-(--sub-text) hover:text-(--primary)" />
          <div className="flex items-center gap-2">
            <MobileNav nav={nav} />
          </div>
        </div>
      </div>
    </header>
  );
}
