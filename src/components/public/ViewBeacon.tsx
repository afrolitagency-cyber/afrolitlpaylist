"use client";

import { useEffect } from "react";
import { getSessionId } from "@/lib/session-id";

/**
 * Statically generated pages serve cached HTML and run no server code on view,
 * so viewCount cannot be incremented during render. The count is written from
 * the client instead, fire-and-forget, decoupled from the page's caching.
 */
export function ViewBeacon({ postId, path }: { postId?: string; path: string }) {
  useEffect(() => {
    let referrer: string | null = null;
    try {
      if (document.referrer) {
        const r = new URL(document.referrer);
        if (r.host !== location.host) referrer = `${r.host}${r.pathname}`.slice(0, 200);
      }
    } catch {
      /* malformed referrer */
    }

    const params = new URLSearchParams(location.search);
    const payload = JSON.stringify({
      postId,
      path,
      sessionId: getSessionId(),
      referrer,
      utmSource: params.get("utm_source")?.slice(0, 100) ?? null,
      utmMedium: params.get("utm_medium")?.slice(0, 100) ?? null,
      utmCampaign: params.get("utm_campaign")?.slice(0, 100) ?? null,
    });

    const sent =
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon("/api/views", new Blob([payload], { type: "application/json" }));

    if (!sent) {
      void fetch("/api/views", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {
        /* a missed view is not worth surfacing */
      });
    }
  }, [postId, path]);

  return null;
}
