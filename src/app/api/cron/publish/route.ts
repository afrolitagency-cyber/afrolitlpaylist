import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Flips SCHEDULED → PUBLISHED. Serverless has no long-running timer, so the
 *  schedule is enforced by this poll, not by the app waiting around. */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const now = new Date();

  const [posts, episodes, events] = await Promise.all([
    prisma.post.findMany({ where: { status: "SCHEDULED", publishedAt: { lte: now } }, select: { id: true, slug: true } }),
    prisma.episode.findMany({ where: { status: "SCHEDULED", publishedAt: { lte: now } }, select: { id: true } }),
    prisma.event.findMany({ where: { status: "SCHEDULED", startsAt: { gte: now } }, select: { id: true } }),
  ]);

  if (posts.length) {
    await prisma.post.updateMany({ where: { id: { in: posts.map((p: { id: string }) => p.id) } }, data: { status: "PUBLISHED" } });
    posts.forEach((p: { slug: string }) => revalidatePath(`/blog/${p.slug}`));
    revalidateTag("posts");
    revalidatePath("/");
  }
  if (episodes.length) {
    await prisma.episode.updateMany({ where: { id: { in: episodes.map((e: { id: string }) => e.id) } }, data: { status: "PUBLISHED" } });
    revalidatePath("/episodes");
  }
  if (events.length) {
    await prisma.event.updateMany({ where: { id: { in: events.map((e: { id: string }) => e.id) } }, data: { status: "PUBLISHED" } });
    revalidatePath("/events");
  }

  return NextResponse.json({ published: { posts: posts.length, episodes: episodes.length, events: events.length } });
}
