"use client";

import { useEffect } from "react";
import { getSessionId } from "@/lib/session-id";

/**
 * Statically generated pages serve cached HTML and run no server code on view,
 * so viewCount cannot be incremented during render. The count is written from
 * the client instead, fire-and-forget, decoupled from the page's caching.
 */
const SEEN_KEY = "al_seen_views";

function alreadyCounted(path: string): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) && list.includes(path);
  } catch {
    return false;
  }
}

function remember(path: string) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    const next = (Array.isArray(list) ? list.filter((item) => item !== path) : []) as string[];
    next.push(path);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next.slice(-300)));
  } catch {
    /* private mode: the server still counts this reader once per day */
  }
}

export function ViewBeacon({ postId, path }: { postId?: string; path: string }) {
  useEffect(() => {
    if (alreadyCounted(path)) return;
    remember(path);

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
