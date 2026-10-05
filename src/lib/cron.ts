import { NextResponse } from "next/server";

/**
 * Cron endpoints are public URLs, so they authenticate with a shared secret.
 * Vercel sends it as a Bearer header; a missing CRON_SECRET fails closed rather
 * than leaving the endpoint open.
 */
export function assertCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });

  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return null;
}
