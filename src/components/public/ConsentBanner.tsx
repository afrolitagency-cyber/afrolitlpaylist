"use client";

import { useEffect, useState } from "react";
import { readConsent, writeConsent, CONSENT_OPEN_EVENT, type Consent } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function ConsentBanner() {
  /**
   * Starts `false` on purpose. The server renders this page with no access to
   * localStorage, so if the initial state were computed from storage the server
   * HTML and the first client render would disagree and React would throw a
   * hydration error. The bar can only ever be switched on inside the effect
   * below, which runs after hydration.
   */
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!GA_ID) return; // nothing to consent to
    if (readConsent() === null) setShow(true);

    const open = () => setShow(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  if (!GA_ID || !show) return null;

  const decide = (value: Consent) => {
    writeConsent(value);
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-(--border-strong) bg-(--card-bg) p-4"
    >
      <div className="wrap flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-(--sub-text)">
          We use Google Analytics to see which pages people read. It sets cookies
          (<code>_ga</code>) and shares the visit with Google. Our own page counts
          set no cookies and run either way.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("denied")}
            className="rounded border border-(--border-strong) px-4 py-2 text-[13px] font-semibold"
          >
            Decline
          </button>
          <button
            onClick={() => decide("granted")}
            className="rounded bg-(--primary) px-4 py-2 text-[13px] font-semibold text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
