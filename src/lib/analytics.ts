import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** The complete set of events. Adding one here is the only way to record one. */
export const EVENT_NAMES = [
  "newsletter_subscribe",
  "newsletter_confirm",
  "comment_submit",
  "contact_submit",
  "event_register",
  "artist_submit_profile",
  "search_no_results",
  "listen_click",
  "share_click",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const EVENT_NAME_SET = new Set<string>(EVENT_NAMES);

export function isEventName(value: string): value is EventName {
  return EVENT_NAME_SET.has(value);
}

type TrackInput = {
  name: EventName;
  path?: string | null;
  entityId?: string | null;
  label?: string | null;
  meta?: Record<string, string | number | boolean> | null;
  sessionId?: string | null;
  isBot?: boolean;
};

/** Fire-and-forget. Never throws: recording an action must not block the action. */
export async function track(input: TrackInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: input.name,
        path: input.path ?? null,
        entityId: input.entityId ?? null,
        label: input.label ?? null,
        meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        sessionId: input.sessionId ?? null,
        isBot: input.isBot ?? false,
      },
    });
  } catch {
    /* analytics is never load-bearing */
  }
}
