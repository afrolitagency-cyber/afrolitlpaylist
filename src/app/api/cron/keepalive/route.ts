import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manual only. The daily noon schedule was removed so Neon can sleep. */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  await prisma.$queryRaw`SELECT 1`;

  const yearAgo = new Date(Date.now() - 400 * 86_400_000);
  const botCutoff = new Date(Date.now() - 30 * 86_400_000);
  const [oldRows, botRows] = await Promise.all([
    prisma.pageView.deleteMany({ where: { createdAt: { lt: yearAgo } } }),
    prisma.pageView.deleteMany({ where: { isBot: true, createdAt: { lt: botCutoff } } }),
  ]);

  return NextResponse.json({ ok: true, at: new Date().toISOString(), pruned: { oldRows: oldRows.count, botRows: botRows.count } });
}
