import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import { DesktopNav } from "../shared";
import type { HeaderProps } from "../types";

const COUNTRIES = "Nigeria · Ghana · South Africa · Kenya · Tanzania";

export default function Header({ nav, identity }: HeaderProps) {
  return (
    <>
      <div className="relative h-[clamp(112px,34vw,220px)] w-full overflow-hidden bg-gradient-to-b from-[#1d1d1d] via-[#2e2e2e] to-black">
        <img
          src={identity.bannerUrl || "/masthead/rema-crowd.gif"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
        />
        <Link href="/" className="absolute inset-0 flex items-center justify-center gap-2 px-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] sm:gap-3">
          <span className="inline-flex [&_svg]:h-9 [&_svg]:w-9 sm:[&_svg]:h-11 sm:[&_svg]:w-11 lg:[&_svg]:h-[52px] lg:[&_svg]:w-[52px]">
            <LogoMark size={52} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-black tracking-[.04em] text-white sm:text-[22px] lg:text-[30px]">
              AFRO<em className="not-italic text-(--primary)">LIT</em><span className="font-normal">PLAYLIST</span>
            </span>
            <span className="text-[10px] text-white/80 sm:text-xs">{identity.tagline}</span>
          </span>
        </Link>
      </div>

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
            linkClass="text-[13px] font-bold uppercase tracking-wide text-(--sub-text) hover:text-(--primary)" />
          <div className="flex items-center gap-2">
            <MobileNav nav={nav} />
          </div>
        </div>
      </header>
    </>
  );
}
