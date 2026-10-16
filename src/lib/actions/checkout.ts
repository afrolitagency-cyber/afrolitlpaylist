"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runAction, type ActionState } from "./_result";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import {
  HOLD_MS,
  MAX_TICKETS_PER_ORDER,
  newOrderReference,
  siteUrl,
} from "@/lib/checkout";

const itemSchema = z.object({
  tierId: z.string().cuid(),
  qty: z.number().int().positive(),
});

const checkoutInput = z.object({
  eventId: z.string().cuid(),
  slug: z.string().min(1).max(140),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().min(7).max(40),
  items: z.array(itemSchema).min(1).max(20),
  holderNames: z.array(z.string().max(120)).max(200).default([]),
});

async function releaseHolds(
  eventId: string,
  items: { tierId: string; qty: number }[],
  totalQty: number,
) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "Event"
      SET "ticketsHeld" = "ticketsHeld" - ${totalQty}
      WHERE id = ${eventId} AND "ticketsHeld" >= ${totalQty}
    `;
    for (const item of [...items].sort((a, b) => a.tierId.localeCompare(b.tierId))) {
      await tx.$executeRaw`
        UPDATE "TicketTier"
        SET held = held - ${item.qty}
        WHERE id = ${item.tierId} AND held >= ${item.qty}
      `;
    }
  });
}

export async function startCheckout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    if (!paystackConfigured()) {
      return { ok: false, error: "Payments are not configured yet. Add PAYSTACK_SECRET_KEY and try again." };
    }

    let itemsRaw: unknown = [];
    try {
      itemsRaw = JSON.parse(String(formData.get("items") ?? "[]"));
    } catch {
      return { ok: false, error: "Select your tickets again." };
    }
    let holdersRaw: unknown = [];
    try {
      holdersRaw = JSON.parse(String(formData.get("holderNames") ?? "[]"));
    } catch {
      holdersRaw = [];
    }

    const data = checkoutInput.parse({
      eventId: formData.get("eventId"),
      slug: formData.get("slug"),
      buyerName: String(formData.get("buyerName") ?? "").trim(),
      buyerEmail: String(formData.get("buyerEmail") ?? "").trim().toLowerCase(),
      buyerPhone: String(formData.get("buyerPhone") ?? "").trim(),
      items: itemsRaw,
      holderNames: holdersRaw,
    });

    const totalQty = data.items.reduce((n, i) => n + i.qty, 0);
    if (totalQty > MAX_TICKETS_PER_ORDER) {
      return { ok: false, error: `You can buy at most ${MAX_TICKETS_PER_ORDER} tickets in one order.` };
    }

    const wantedIds = [...new Set(data.items.map((i) => i.tierId))];
    const tierRows = await prisma.ticketTier.findMany({
      where: { eventId: data.eventId, id: { in: wantedIds } },
      select: { id: true, name: true, maxPerOrder: true },
    });
    if (tierRows.length !== wantedIds.length) {
      return { ok: false, error: "A ticket type in this order is no longer on sale. Refresh and try again." };
    }
    for (const line of data.items) {
      const tier = tierRows.find((t) => t.id === line.tierId);
      if (!tier) continue;
      if (line.qty > tier.maxPerOrder) {
        return {
          ok: false,
          error: `You can buy at most ${tier.maxPerOrder} ${tier.name} ticket${tier.maxPerOrder === 1 ? "" : "s"} in one order.`,
        };
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, slug: true, status: true, ticketed: true, soldOut: true, currency: true },
    });
    if (!event || event.slug !== data.slug || event.status !== "PUBLISHED" || !event.ticketed) {
      return { ok: false, error: "This event is not on sale." };
    }
    if (event.soldOut) return { ok: false, error: "This event is sold out." };

    const itemsSorted = [...data.items].sort((a, b) => a.tierId.localeCompare(b.tierId));
    const now = new Date();
    const reference = newOrderReference();
    const holdsUntil = new Date(Date.now() + HOLD_MS);

    let totalKobo = 0;
    const orderItems: { tierId: string; quantity: number; unitKobo: number }[] = [];

    try {
      await prisma.$transaction(async (tx) => {
        const room = await tx.$executeRaw`
          UPDATE "Event"
          SET "ticketsHeld" = "ticketsHeld" + ${totalQty}
          WHERE id = ${event.id}
            AND (capacity IS NULL
                 OR (capacity - "ticketsSold" - "ticketsHeld") >= ${totalQty})
        `;
        if (Number(room) !== 1) throw new Error("EVENT_FULL");

        for (const line of itemsSorted) {
          const held = await tx.$executeRaw`
            UPDATE "TicketTier"
            SET held = held + ${line.qty}
            WHERE id = ${line.tierId}
              AND "eventId" = ${event.id}
              AND active = true
              AND "isComp" = false
              AND (allocation - sold - held) >= ${line.qty}
              AND ${line.qty} <= "maxPerOrder"
              AND (${now} <= COALESCE("salesEndsAt", ${now}))
          `;
          if (Number(held) !== 1) throw new Error(`TIER_FULL:${line.tierId}`);

          const tier = await tx.ticketTier.findUnique({
            where: { id: line.tierId },
            select: { priceKobo: true },
          });
          if (!tier) throw new Error(`TIER_FULL:${line.tierId}`);
          totalKobo += tier.priceKobo * line.qty;
          orderItems.push({ tierId: line.tierId, quantity: line.qty, unitKobo: tier.priceKobo });
        }

        if (!Number.isInteger(totalKobo) || totalKobo < 1) throw new Error("AMOUNT");

        await tx.order.create({
          data: {
            eventId: event.id,
            buyerName: data.buyerName,
            buyerEmail: data.buyerEmail,
            buyerPhone: data.buyerPhone,
            status: "PENDING",
            totalKobo,
            currency: event.currency || "NGN",
            reference,
            holdsUntil,
            items: { create: orderItems },
          },
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "EVENT_FULL") return { ok: false, error: "The venue is full. Try fewer tickets." };
      if (msg.startsWith("TIER_FULL")) return { ok: false, error: "Those tickets just sold out or the window closed. Refresh and try again." };
      if (msg === "AMOUNT") return { ok: false, error: "That order total isn’t valid." };
      throw err;
    }

    const callbackUrl = `${siteUrl()}/events/${event.slug}/order/${reference}`;
    try {
      const { authorizationUrl } = await initializeTransaction({
        email: data.buyerEmail,
        amountKobo: totalKobo,
        reference,
        callbackUrl,
        metadata: {
          eventId: event.id,
          orderId: reference,
          holderNames: data.holderNames,
        },
      });
      return { ok: true, authorizationUrl, reference };
    } catch (err) {
      await prisma.order.updateMany({
        where: { reference, status: "PENDING" },
        data: { status: "FAILED" },
      });
      await releaseHolds(event.id, itemsSorted, totalQty);
      const message = err instanceof Error ? err.message : "Paystack could not start the payment.";
      return { ok: false, error: message };
    }
  });
}
