import { NextResponse } from "next/server";
import { assertCron } from "@/lib/cron";
import { tickNewsletter } from "@/lib/newsletter-tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Hobby kills around 10s; cron-job.org every 15–20 min drains the rest. */
export const maxDuration = 60;

/**
 * External scheduler (cron-job.org) should GET this URL every 15–20 minutes
 * with `Authorization: Bearer $CRON_SECRET`. The daily Vercel Hobby cron is
 * only a backup.
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const result = await tickNewsletter();
  return NextResponse.json(result);
}
