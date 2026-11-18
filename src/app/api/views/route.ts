import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { looksLikeBot, deviceFromUA } from "@/lib/bot-detect";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ok = () => NextResponse.json({ ok: true });

/** Counting endpoint for the view beacon. Deliberately cheap and unauthenticated —
 *  it can only ever increment a counter. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const path = body.path;
    if (typeof path !== "string" || path.length > 300) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const h = req.headers;
    const userAgent = h.get("user-agent");
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";

    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

    const sessionId = str(body.sessionId, 64);
    const referrer = str(body.referrer, 200);
    // Crawlers and link previews never get a row, and this returns before Neon is touched.
    if (looksLikeBot({ userAgent, referrer, sessionId })) return ok();

    const burst = await rateLimit(`views:${ip}`, LIMITS.views.max, LIMITS.views.windowSec);
    if (!burst.ok) return ok();

    const postId = str(body.postId, 64);
    const once = await rateLimit(`viewed:${ip}:${postId ?? path}`, LIMITS.viewOnce.max, LIMITS.viewOnce.windowSec);
    if (!once.ok) return ok();

    const data = {
      path,
      postId,
      sessionId,
      referrer,
      utmSource: str(body.utmSource, 100),
      utmMedium: str(body.utmMedium, 100),
      utmCampaign: str(body.utmCampaign, 100),
      country: h.get("x-vercel-ip-country")?.slice(0, 2) ?? null,
      device: deviceFromUA(userAgent),
      isBot: false,
    };

    await prisma.$transaction([
      prisma.pageView.create({ data }),
      ...(data.postId
        ? [prisma.post.update({ where: { id: data.postId }, data: { viewCount: { increment: 1 } } })]
        : []),
    ]);

    return ok();
  } catch {
    return ok();
  }
}
