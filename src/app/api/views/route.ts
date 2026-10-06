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

    const limit = await rateLimit(`views:${ip}`, LIMITS.views.max, LIMITS.views.windowSec);
    if (!limit.ok) return ok();

    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

    const sessionId = str(body.sessionId, 64);
    const referrer = str(body.referrer, 200);
    const isBot = looksLikeBot({ userAgent, referrer, sessionId });

    const data = {
      path,
      postId: str(body.postId, 64),
      sessionId,
      referrer,
      utmSource: str(body.utmSource, 100),
      utmMedium: str(body.utmMedium, 100),
      utmCampaign: str(body.utmCampaign, 100),
      country: h.get("x-vercel-ip-country")?.slice(0, 2) ?? null,
      device: deviceFromUA(userAgent),
      isBot,
    };

    await prisma.$transaction([
      prisma.pageView.create({ data }),
      ...(data.postId && !isBot
        ? [prisma.post.update({ where: { id: data.postId }, data: { viewCount: { increment: 1 } } })]
        : []),
    ]);

    return ok();
  } catch {
    return ok();
  }
}
