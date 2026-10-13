"use client";

import { useEffect, useRef } from "react";

const PUB = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export function NetworkUnit({ unit, w, h }: { unit: string; w?: number; h?: number }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!PUB || pushed.current) return;
    pushed.current = true;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      /* a blocked ad is not an error worth surfacing */
    }
  }, []);

  if (!PUB) return null;

  return (
    <ins
      className="adsbygoogle block"
      style={{ display: "block", width: w ? `${w}px` : "100%", height: h ? `${h}px` : "auto" }}
      data-ad-client={PUB}
      data-ad-slot={unit}
    />
  );
}
