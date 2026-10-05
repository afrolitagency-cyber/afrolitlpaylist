import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Counting endpoint for the view beacon. Deliberately cheap and unauthenticated —
 *  it can only ever increment a counter. */
export async function POST(req: Request) {
  try {
    const { postId, path } = (await req.json()) as { postId?: string; path?: string };
    if (typeof path !== "string" || path.length > 300) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.pageView.create({ data: { path, postId: postId ?? null } }),
      ...(postId
        ? [prisma.post.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } })]
        : []),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    // never let analytics failures surface to a reader
    return NextResponse.json({ ok: true });
  }
}
