import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySvix(raw: string, id: string, timestamp: string, signatureHeader: string, secret: string) {
  const age = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret);
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest("base64");
  return signatureHeader.split(" ").some((part) => {
    const value = part.startsWith("v1,") ? part.slice(3) : part;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function emailsFrom(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const d = data as { to?: unknown; email?: unknown };
  const to = d.to;
  if (typeof d.email === "string") return [d.email.toLowerCase()];
  if (typeof to === "string") return [to.toLowerCase()];
  if (Array.isArray(to)) return to.filter((x): x is string => typeof x === "string").map((x) => x.toLowerCase());
  return [];
}

/** Resend bounce / complaint → exclude from future campaigns. */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook unset" }, { status: 503 });

  const raw = await req.text();
  const id = req.headers.get("svix-id") ?? "";
  const timestamp = req.headers.get("svix-timestamp") ?? "";
  const signature = req.headers.get("svix-signature") ?? "";
  if (!verifySvix(raw, id, timestamp, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  let payload: { type?: string; data?: unknown };
  try {
    payload = JSON.parse(raw) as { type?: string; data?: unknown };
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const type = payload.type ?? "";
  const status = type.includes("complained") ? "COMPLAINED" : type.includes("bounced") ? "BOUNCED" : null;
  if (!status) return NextResponse.json({ ok: true, ignored: type });

  const emails = emailsFrom(payload.data);
  if (emails.length) {
    await prisma.newsletterSubscriber.updateMany({
      where: { email: { in: emails } },
      data: { status, wantsBlog: false, wantsEvents: false },
    });
  }
  return NextResponse.json({ ok: true, updated: emails.length });
}
