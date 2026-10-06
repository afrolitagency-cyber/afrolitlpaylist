"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent, CONSENT_EVENT, type Consent } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Same hydration rule as the banner: storage is read after mount, never during
  // render. Listening for the event means Accept starts GA immediately, with no
  // reload, and Decline stops it.
  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  // The App Router navigates on the client, so gtag's automatic page_view fires
  // once on first load and never again — every later article read would be
  // invisible. One explicit page_view per route change instead.
  useEffect(() => {
    if (!GA_ID || consent !== "granted") return;
    const qs = searchParams.toString();
    window.gtag?.("event", "page_view", { page_path: qs ? `${pathname}?${qs}` : pathname });
  }, [consent, pathname, searchParams]);

  if (!GA_ID || consent !== "granted") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { send_page_view: false });
      `}</Script>
    </>
  );
}
