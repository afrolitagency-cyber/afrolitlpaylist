import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: unknown };
    if (typeof id !== "string" || id.length > 64) return ok();

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = createHash("sha256").update(forwarded).digest("hex").slice(0, 16);
    const limit = await rateLimit(`adimp:${key}`, LIMITS.ads.max, LIMITS.ads.windowSec);
    if (!limit.ok) return ok();

    const day = new Date(new Date().toISOString().slice(0, 10));
    await prisma.$transaction([
      prisma.adCreative.update({ where: { id }, data: { impressions: { increment: 1 } } }),
      prisma.adStatDaily.upsert({
        where: { creativeId_day: { creativeId: id, day } },
        create: { creativeId: id, day, impressions: 1 },
        update: { impressions: { increment: 1 } },
      }),
    ]);
    return ok();
  } catch {
    return ok();
  }
}
