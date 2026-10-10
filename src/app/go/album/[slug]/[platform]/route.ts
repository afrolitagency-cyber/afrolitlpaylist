import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlatform, listenTargets, readLinks } from "@/lib/album-platforms";
import { track } from "@/lib/analytics";
import { looksLikeBot } from "@/lib/bot-detect";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Counts an outbound "Listen on" click, then forwards the reader. The target is
 * always looked up from the album row, never taken from the request, so this
 * cannot be used as an open redirect.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; platform: string }> }) {
  const { slug, platform } = await params;
  const home = new URL("/albums", req.url);
  if (!isPlatform(platform)) return NextResponse.redirect(home, 302);

  const album = await prisma.album
    .findUnique({ where: { slug }, select: { id: true, title: true, artistName: true, links: true, published: true } })
    .catch(() => null);
  if (!album || !album.published) return NextResponse.redirect(home, 302);

  const target = listenTargets({ title: album.title, artistName: album.artistName, links: readLinks(album.links) })
    .find((t) => t.key === platform);
  if (!target) return NextResponse.redirect(new URL(`/albums/${slug}`, req.url), 302);

  try {
    const h = req.headers;
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
    const limit = await rateLimit(`events:${ip}`, LIMITS.events.max, LIMITS.events.windowSec);
    if (limit.ok) {
      const referrer = h.get("referer");
      await track({
        name: "album_listen_click",
        entityId: album.id,
        label: platform,
        path: referrer ? new URL(referrer).pathname.slice(0, 300) : null,
        isBot: looksLikeBot({ userAgent: h.get("user-agent"), referrer, sessionId: null }),
      });
    }
  } catch {
    /* counting never blocks the redirect */
  }

  return NextResponse.redirect(target.url, 302);
}
