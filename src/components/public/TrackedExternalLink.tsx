"use client";

import { getSessionId } from "@/lib/session-id";

/** Records a listen or share click, then follows the link. */
export function TrackedExternalLink({
  href,
  className,
  children,
  name,
  entityId,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  name: "listen_click" | "share_click";
  entityId?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        const payload = JSON.stringify({
          name,
          path: location.pathname,
          entityId: entityId ?? null,
          sessionId: getSessionId(),
        });
        const sent =
          typeof navigator.sendBeacon === "function" &&
          navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
        if (!sent) {
          void fetch("/api/events", {
            method: "POST",
            body: payload,
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(() => undefined);
        }
      }}
    >
      {children}
    </a>
  );
}
