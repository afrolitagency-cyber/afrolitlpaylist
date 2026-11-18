import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type HeldOrder = {
  id: string;
  eventId: string;
  items: { tierId: string; quantity: number }[];
};

/**
 * Give back tickets from unpaid orders whose 15-minute hold has passed.
 * Pass an event id to limit the sweep to that event. The claim is conditional
 * on the order still being PENDING, so a payment that lands in the same moment
 * keeps the tickets.
 */
export async function releaseExpiredHolds(eventId?: string): Promise<number> {
  const now = new Date();
  const due = await prisma.order.findMany({
    where: {
      status: "PENDING",
      holdsUntil: { lt: now },
      ...(eventId ? { eventId } : {}),
    },
    select: {
      id: true,
      eventId: true,
      items: { select: { tierId: true, quantity: true } },
    },
    orderBy: { holdsUntil: "asc" },
    take: 40,
  });

  let released = 0;
  for (const order of due) {
    if (await expireHold(order, now)) released += 1;
  }
  return released;
}

/**
 * Inside the checkout transaction: one open hold per email per event.
 * An advisory lock stops two checkouts for the same buyer landing together.
 * A failure rolls the whole checkout back, so the earlier hold stays.
 */
export async function releaseBuyerHoldsTx(
  tx: Prisma.TransactionClient,
  eventId: string,
  buyerEmail: string,
): Promise<void> {
  const digest = crypto.createHash("sha256").update(`${eventId}:${buyerEmail}`).digest();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${digest.readInt32BE(0)}, ${digest.readInt32BE(4)})`;
  const open = await tx.order.findMany({
    where: { eventId, buyerEmail, status: "PENDING" },
    select: {
      id: true,
      eventId: true,
      items: { select: { tierId: true, quantity: true } },
    },
  });
  for (const order of open) {
    await expireHoldTx(tx, order);
  }
}

async function expireHold(order: HeldOrder, expiredBefore?: Date): Promise<boolean> {
  try {
    return await prisma.$transaction((tx) => expireHoldTx(tx, order, expiredBefore));
  } catch (err) {
    console.error("[holds] could not release", order.id, err);
    return false;
  }
}

async function expireHoldTx(
  tx: Prisma.TransactionClient,
  order: HeldOrder,
  expiredBefore?: Date,
): Promise<boolean> {
  const totalQty = order.items.reduce((n, item) => n + item.quantity, 0);
  const items = [...order.items].sort((a, b) => a.tierId.localeCompare(b.tierId));
  const claimed = await tx.order.updateMany({
    where: {
      id: order.id,
      status: "PENDING",
      ...(expiredBefore ? { holdsUntil: { lt: expiredBefore } } : {}),
    },
    data: { status: "EXPIRED", holdsUntil: null },
  });
  if (claimed.count !== 1) return false;

  const eventRows = await tx.$executeRaw`
    UPDATE "Event"
    SET "ticketsHeld" = "ticketsHeld" - ${totalQty}
    WHERE id = ${order.eventId} AND "ticketsHeld" >= ${totalQty}
  `;
  if (Number(eventRows) !== 1) throw new Error("HOLD_MISMATCH");

  for (const item of items) {
    const tierRows = await tx.$executeRaw`
      UPDATE "TicketTier"
      SET held = held - ${item.quantity}
      WHERE id = ${item.tierId} AND held >= ${item.quantity}
    `;
    if (Number(tierRows) !== 1) throw new Error("HOLD_MISMATCH");
  }
  return true;
}
