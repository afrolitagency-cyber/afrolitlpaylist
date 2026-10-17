import { NextResponse } from "next/server";
import { applyListPreference } from "@/lib/newsletter-subscribe";
import { parseList, verifyManageToken } from "@/lib/newsletter-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One-click List-Unsubscribe-Post. No login. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const s = url.searchParams.get("s") ?? "";
  const t = url.searchParams.get("t") ?? "";
  const list = parseList(url.searchParams.get("list"));
  if (!s || !verifyManageToken(s, t)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  await applyListPreference(s, list);
  return NextResponse.json({ ok: true });
}
