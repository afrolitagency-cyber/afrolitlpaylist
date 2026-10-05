"use client";

import { useEffect } from "react";

/**
 * Statically generated pages serve cached HTML and run no server code on view,
 * so viewCount cannot be incremented during render. The count is written from
 * the client instead, fire-and-forget, decoupled from the page's caching.
 */
export function ViewBeacon({ postId, path }: { postId?: string; path: string }) {
  useEffect(() => {
    const payload = JSON.stringify({ postId, path });
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
