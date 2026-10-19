import Link from "next/link";
import { Brand } from "@/components/ui/Logo";
import { MobileNav } from "@/components/ui/MobileNav";
import { DesktopNav, LiveClock } from "../shared";
import type { HeaderProps } from "../types";

/** Centred masthead over a decorative band, with a near-black nav bar and an
 *  active item rendered as a filled box. */
export default function Header({ nav, identity }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] lg:static">
      <div className="relative h-[clamp(112px,34vw,220px)] w-full overflow-hidden bg-gradient-to-b from-[#1d1d1d] via-[#2e2e2e] to-black">
        <img
          src={identity.bannerUrl || "/masthead/rema-crowd.gif"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
        />
        <Link href="/" className="absolute inset-0 flex items-center justify-center px-4 text-[17px] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] sm:text-[20px] lg:text-[22px]">
          <Brand size={40} tagline={identity.tagline} />
        </Link>
      </div>
      <div className="bg-black">
        <div className="wrap flex items-center justify-between py-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <Link href="/events" className="rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white sm:px-6 lg:col-start-2 lg:justify-self-center">
            Get Event Ticket
          </Link>
          <div className="lg:col-start-3 lg:justify-self-end">
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
