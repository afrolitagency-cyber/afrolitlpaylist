import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { sendTicketPurchaseEmail } from "@/lib/services/ticket-email";

function ticketCode() {
  const chunk = () => crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `ALP-${chunk()}-${chunk()}-${chunk()}`;
}

function holderList(meta: Record<string, unknown> | null, qty: number, fallback: string) {
  const raw = meta?.holderNames;
  const names = Array.isArray(raw) ? raw.map((n) => (typeof n === "string" ? n.trim() : "")) : [];
  return Array.from({ length: qty }, (_, i) => names[i] || fallback);
}

const LATE_PAYMENT_NOTE =
  "Paystack collected this payment after the hold expired, and the tickets were no longer available.";

export async function fulfillPaidOrder(reference: string) {
  const existing = await prisma.order.findUnique({
    where: { reference },
    include: { items: true, tickets: true },
  });
  if (!existing) return { ok: false as const, reason: "missing" };
  if (existing.status === "PAID") return { ok: true as const, order: existing };
  if (existing.status !== "PENDING" && existing.status !== "EXPIRED") {
    return { ok: false as const, reason: "closed" };
  }

  const verified = await verifyTransaction(reference);
  if (!verified.success) return { ok: false as const, reason: "unpaid" };
  if (verified.amountKobo != null && verified.amountKobo !== existing.totalKobo) {
    return { ok: false as const, reason: "amount" };
  }

  const totalQty = existing.items.reduce((n, i) => n + i.quantity, 0);
  const names = holderList(verified.metadata, totalQty, existing.buyerName);
  const items = [...existing.items].sort((a, b) => a.tierId.localeCompare(b.tierId));
  const paidData = {
    status: "PAID" as const,
    paidAt: new Date(),
    feesKobo: verified.feesKobo,
    holdsUntil: null,
    refundNote: null,
  };

  let settled: { issued: boolean; order: typeof existing };
  try {
    settled = await prisma.$transaction(async (tx) => {
      const reload = () => tx.order.findUniqueOrThrow({
        where: { id: existing.id },
        include: { items: true, tickets: true },
      });

      const fromHold = await tx.order.updateMany({
        where: { id: existing.id, status: "PENDING" },
        data: paidData,
      });
      if (fromHold.count === 1) {
        const moved = await tx.$executeRaw`
          UPDATE "Event"
          SET "ticketsHeld" = "ticketsHeld" - ${totalQty},
              "ticketsSold" = "ticketsSold" + ${totalQty}
          WHERE id = ${existing.eventId}
            AND "ticketsHeld" >= ${totalQty}
        `;
        if (Number(moved) !== 1) throw new Error("Could not settle event inventory.");
        for (const item of items) {
          const shifted = await tx.$executeRaw`
            UPDATE "TicketTier"
            SET held = held - ${item.quantity},
                sold = sold + ${item.quantity}
            WHERE id = ${item.tierId}
              AND held >= ${item.quantity}
          `;
          if (Number(shifted) !== 1) throw new Error("Could not settle tier inventory.");
        }
      } else {
        const fromExpired = await tx.order.updateMany({
          where: { id: existing.id, status: "EXPIRED" },
          data: paidData,
        });
        if (fromExpired.count !== 1) {
          return { issued: false, order: await reload() };
        }
        const moved = await tx.$executeRaw`
          UPDATE "Event"
          SET "ticketsSold" = "ticketsSold" + ${totalQty}
          WHERE id = ${existing.eventId}
            AND (capacity IS NULL OR (capacity - "ticketsSold" - "ticketsHeld") >= ${totalQty})
        `;
        if (Number(moved) !== 1) throw new Error("STOCK");
        for (const item of items) {
          const shifted = await tx.$executeRaw`
            UPDATE "TicketTier"
            SET sold = sold + ${item.quantity}
            WHERE id = ${item.tierId}
              AND (allocation - sold - held) >= ${item.quantity}
          `;
          if (Number(shifted) !== 1) throw new Error("STOCK");
        }
      }

      let nameIndex = 0;
      const tickets: { eventId: string; orderId: string; tierId: string; code: string; holderName: string }[] = [];
      for (const item of items) {
        for (let i = 0; i < item.quantity; i += 1) {
          tickets.push({
            eventId: existing.eventId,
            orderId: existing.id,
            tierId: item.tierId,
            code: ticketCode(),
            holderName: names[nameIndex] || existing.buyerName,
          });
          nameIndex += 1;
        }
      }
      await tx.ticket.createMany({ data: tickets });
      return { issued: true, order: await reload() };
    });
  } catch (err) {
    if (err instanceof Error && err.message === "STOCK") {
      await prisma.order.updateMany({
        where: { id: existing.id, status: "EXPIRED", refundNote: null },
        data: { refundNote: LATE_PAYMENT_NOTE },
      });
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: existing.id },
        include: { items: true, tickets: true },
      });
      return { ok: true as const, order, unavailable: true as const };
    }
    throw err;
  }

  const paid = settled.order;
  if (settled.issued) {
    try {
      const full = await prisma.order.findUnique({
        where: { id: paid.id },
        include: {
          event: {
            select: {
              slug: true, title: true, startsAt: true, doorsAt: true, timezone: true,
              venue: true, city: true, address: true, coverImage: true, ageLimit: true,
            },
          },
          items: { include: { tier: { select: { id: true, name: true, admitsCount: true } } } },
          tickets: { orderBy: { createdAt: "asc" } },
        },
      });
      if (full) {
        await sendTicketPurchaseEmail({
          reference: full.reference,
          buyerName: full.buyerName,
          buyerEmail: full.buyerEmail,
          totalKobo: full.totalKobo,
          event: full.event,
          items: full.items,
          tickets: full.tickets,
          itemsByTier: full.items.map((i) => i.tier),
        });
      }
    } catch (err) {
      console.error("[email] ticket purchase send failed", err);
    }
  }

  return { ok: true as const, order: paid };
}

export async function resendTicketEmail(reference: string) {
  const full = await prisma.order.findUnique({
    where: { reference },
    include: {
      event: {
        select: {
          slug: true, title: true, startsAt: true, doorsAt: true, timezone: true,
          venue: true, city: true, address: true, coverImage: true, ageLimit: true,
        },
      },
      items: { include: { tier: { select: { id: true, name: true, admitsCount: true } } } },
      tickets: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!full || full.status !== "PAID" || !full.tickets.length) return false;
  return sendTicketPurchaseEmail({
    reference: full.reference,
    buyerName: full.buyerName,
    buyerEmail: full.buyerEmail,
    totalKobo: full.totalKobo,
    event: full.event,
    items: full.items,
    tickets: full.tickets,
    itemsByTier: full.items.map((i) => i.tier),
  });
}
