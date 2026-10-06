"use client";

import { openConsentSettings } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function ConsentLink() {
  if (!GA_ID) return null;
  return (
    <div className="wrap pb-6 text-center">
      <button
        onClick={openConsentSettings}
        className="text-[12px] text-(--footer-text) underline hover:text-(--primary)"
      >
        Cookie settings
      </button>
    </div>
  );
}
