import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import { DesktopNav, LiveClock } from "../shared";
import type { HeaderProps } from "../types";

/** Centred masthead over a decorative band, with a near-black nav bar and an
 *  active item rendered as a filled box. */
export default function Header({ nav, identity }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] lg:static">
      <div
        className="hidden h-[150px] w-full bg-gradient-to-b from-[#1d1d1d] via-[#2e2e2e] to-black lg:block xl:h-[220px]"
        style={identity.bannerUrl ? { backgroundImage: `url(${identity.bannerUrl})`, backgroundSize: "cover" } : undefined}
        aria-hidden
      />
      <div className="bg-black">
        <div className="wrap flex items-center justify-between gap-3 py-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:py-5">
          <Link href="/" className="flex items-center gap-2.5 lg:col-start-2">
            <LogoMark size={44} />
            <span className="flex flex-col">
              <span className="text-[17px] font-light tracking-[.14em] text-white lg:text-[30px]">
                AFROLIT PLAYLIST
              </span>
              <span className="hidden text-xs text-white/60 lg:block">{identity.tagline}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 lg:col-start-3 lg:justify-self-end">
            <MobileNav nav={nav} />
          </div>
        </div>
      </div>

      <div className="hidden border-t border-white/10 bg-[#0a0a0a] lg:block">
        <div className="wrap flex min-h-[52px] items-center justify-between gap-4">
          <DesktopNav nav={nav} className="items-center"
            linkClass="flex h-[52px] items-center px-3.5 text-[12.5px] font-bold uppercase tracking-wider text-white/85 hover:bg-white/10 hover:text-white" />
          <LiveClock />
        </div>
      </div>
    </header>
  );
}
