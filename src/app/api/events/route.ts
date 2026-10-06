import { NextResponse } from "next/server";
import { looksLikeBot } from "@/lib/bot-detect";
import { isEventName, track } from "@/lib/analytics";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CLIENT_EVENTS = new Set(["listen_click", "share_click"]);
const ok = () => NextResponse.json({ ok: true });

/** Client-side actions only. Names outside the allow-list are ignored. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name : "";
    if (!isEventName(name) || !CLIENT_EVENTS.has(name)) return ok();

    const h = req.headers;
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
    const limit = await rateLimit(`events:${ip}`, LIMITS.events.max, LIMITS.events.windowSec);
    if (!limit.ok) return ok();

    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

    const sessionId = str(body.sessionId, 64);
    const userAgent = h.get("user-agent");
    await track({
      name,
      path: str(body.path, 300),
      entityId: str(body.entityId, 64),
      sessionId,
      isBot: looksLikeBot({ userAgent, referrer: null, sessionId }),
    });
    return ok();
  } catch {
    return ok();
  }
}
