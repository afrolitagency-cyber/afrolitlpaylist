import Link from "next/link";
import type { FooterProps } from "../types";

const COLS = [
  { h: "Explore", links: [["Artists", "/artists"], ["Blog", "/blog"], ["Episodes", "/episodes"], ["Gallery", "/gallery"]] },
  { h: "Community", links: [["Events", "/events"], ["Contact Us", "/contact"]] },
  { h: "Company", links: [["About", "/about"], ["Advertise", "/contact"]] },
] as const;

export default function Footer({ identity }: FooterProps) {
  return (
    <footer className="mt-10 border-t border-(--border-strong) py-11">
      <div className="wrap">
        <div className="mb-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {COLS.map((c) => (
            <div key={c.h}>
              <h5 className="mb-3 text-[13px] font-bold">{c.h}</h5>
              {c.links.map(([label, href]) => (
                <Link key={href} href={href} className="block py-1 text-[13px] text-(--footer-text) hover:text-(--primary)">{label}</Link>
              ))}
            </div>
          ))}
          <div>
            <h5 className="mb-3 text-[13px] font-bold">Follow</h5>
            {Object.entries(identity.socials).map(([k, v]) => (
              <a key={k} href={v} className="block py-1 text-[13px] capitalize text-(--footer-text) hover:text-(--primary)">{k}</a>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-(--footer-text)">© {new Date().getFullYear()} {identity.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
