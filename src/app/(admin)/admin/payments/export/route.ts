import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, can, AuthError } from "@/lib/rbac";
import type { OrderStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED", "EXPIRED"];

function cell(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

export async function GET(req: Request) {
  try {
    await requireRole(...can.manageContent);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    throw err;
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId") || "";
  const statusRaw = url.searchParams.get("status") || "";
  const status = STATUSES.includes(statusRaw as OrderStatus) ? (statusRaw as OrderStatus) : "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00+01:00`) : null;
  const to = toRaw ? new Date(`${toRaw}T23:59:59+01:00`) : null;

  const where: Prisma.OrderWhereInput = {
    ...(eventId ? { eventId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { buyerEmail: { contains: q, mode: "insensitive" } },
            { buyerName: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: {
      event: { select: { title: true } },
      items: { include: { tier: { select: { name: true } } } },
    },
  });

  const header = ["createdAt", "paidAt", "status", "event", "buyerName", "buyerEmail", "buyerPhone", "reference", "totalKobo", "feesKobo", "items"];
  const lines = [header.join(",")];
  for (const o of orders) {
    lines.push([
      cell(o.createdAt.toISOString()),
      cell(o.paidAt?.toISOString() ?? ""),
      cell(o.status),
      cell(o.event.title),
      cell(o.buyerName),
      cell(o.buyerEmail),
      cell(o.buyerPhone ?? ""),
      cell(o.reference),
      String(o.totalKobo),
      String(o.feesKobo ?? 0),
      cell(o.items.map((i) => `${i.quantity}x ${i.tier.name}`).join("; ")),
    ].join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afrolit-payments.csv"`,
    },
  });
}
