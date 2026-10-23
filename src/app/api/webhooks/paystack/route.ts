import { NextResponse } from "next/server";
import { fulfillPaidOrder } from "@/lib/orders";
import { paystackConfigured, verifyPaystackSignature } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack charge.success. Tickets are issued here when the buyer never
 * returns to the order page. The order page still verifies on arrival.
 * Unknown references return 200 so Paystack stops retrying.
 */
export async function POST(req: Request) {
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "webhook unset" }, { status: 503 });
  }

  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: unknown } };
  try {
    payload = JSON.parse(raw) as { event?: string; data?: { reference?: unknown } };
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (payload.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: payload.event ?? "" });
  }

  const reference = typeof payload.data?.reference === "string" ? payload.data.reference.trim() : "";
  if (!reference) return NextResponse.json({ ok: true, ignored: "no reference" });

  try {
    const settled = await fulfillPaidOrder(reference);
    if (!settled.ok && settled.reason === "missing") {
      return NextResponse.json({ ok: true, ignored: "unknown reference" });
    }
    if (!settled.ok && settled.reason === "unpaid") {
      return NextResponse.json({ error: "not verified yet" }, { status: 500 });
    }
    if (!settled.ok) {
      console.error("[paystack] webhook did not settle", reference, settled.reason);
      return NextResponse.json({ ok: true, ignored: settled.reason });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[paystack] webhook failed", reference, err);
    return NextResponse.json({ error: "settle failed" }, { status: 500 });
  }
}
