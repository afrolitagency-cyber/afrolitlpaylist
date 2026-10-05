import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keeps Neon warm so low-traffic hours don't cold-start the first real visitor. */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
