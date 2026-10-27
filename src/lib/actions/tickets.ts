"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { nairaToKobo } from "@/lib/money";
import { runAction, type ActionState } from "./_result";

const ticketTierInput = z.object({
  id: z.string().cuid().optional(),
  eventId: z.string().cuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional().nullable(),
  priceNaira: z.number().int().nonnegative(),
  allocation: z.number().int().positive(),
  salesStartsAt: z.coerce.date().optional().nullable(),
  salesEndsAt: z.coerce.date().optional().nullable(),
  maxPerOrder: z.number().int().min(1).max(50).default(10),
  admitsCount: z.number().int().min(1).max(100).default(1),
  rollsIntoTierId: z.union([z.string().cuid(), z.literal("")]).optional().nullable()
    .transform((v) => (v ? v : null)),
  isComp: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

function revalidateEvent(eventId: string, slug?: string | null) {
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
}

export async function saveTicketTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);

    const data = ticketTierInput.parse({
      id: formData.get("id") || undefined,
      eventId: formData.get("eventId"),
      name: formData.get("name"),
      description: String(formData.get("description") ?? "").trim() || null,
      priceNaira: Number(formData.get("priceNaira") ?? 0),
      allocation: Number(formData.get("allocation")),
      salesStartsAt: formData.get("salesStartsAt") || null,
      salesEndsAt: formData.get("salesEndsAt") || null,
      maxPerOrder: formData.get("maxPerOrder") ? Number(formData.get("maxPerOrder")) : 10,
      admitsCount: formData.get("admitsCount") ? Number(formData.get("admitsCount")) : 1,
      rollsIntoTierId: formData.get("rollsIntoTierId") || null,
      isComp: formData.get("isComp") === "on", // hidden "on" | "off"; never infer from the tier name
      sortOrder: formData.get("sortOrder") ? Number(formData.get("sortOrder")) : 0,
      active: formData.get("active") === "on",
    });

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, slug: true },
    });
    if (!event) return { ok: false, error: "Event not found." };

    const priceKobo = data.isComp ? 0 : nairaToKobo(data.priceNaira);

    if (data.rollsIntoTierId) {
      if (data.rollsIntoTierId === data.id) {
        return { ok: false, error: "A tier cannot roll into itself." };
      }
      const target = await prisma.ticketTier.findUnique({
        where: { id: data.rollsIntoTierId },
        select: { eventId: true },
      });
      if (!target || target.eventId !== data.eventId) {
        return { ok: false, error: "Rollover target must be another tier on this event." };
      }
    }

    if (data.id) {
      const existing = await prisma.ticketTier.findUnique({
        where: { id: data.id },
        select: { eventId: true, sold: true, held: true },
      });
      if (!existing || existing.eventId !== data.eventId) {
        return { ok: false, error: "That ticket tier does not belong to this event." };
      }
      const committed = existing.sold + existing.held;
      if (data.allocation < committed) {
        return {
          ok: false,
          error: `Allocation cannot drop below ${committed} (sold + held).`,
        };
      }

      await prisma.ticketTier.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          priceKobo,
          allocation: data.allocation,
          salesStartsAt: data.salesStartsAt,
          salesEndsAt: data.salesEndsAt,
          maxPerOrder: data.maxPerOrder,
          admitsCount: data.admitsCount,
          rollsIntoTierId: data.rollsIntoTierId,
          isComp: data.isComp,
          sortOrder: data.sortOrder,
          active: data.active,
        },
      });
    } else {
      await prisma.ticketTier.create({
        data: {
          eventId: data.eventId,
          name: data.name,
          description: data.description,
          priceKobo,
          allocation: data.allocation,
          salesStartsAt: data.salesStartsAt,
          salesEndsAt: data.salesEndsAt,
          maxPerOrder: data.maxPerOrder,
          admitsCount: data.admitsCount,
          rollsIntoTierId: data.rollsIntoTierId,
          isComp: data.isComp,
          sortOrder: data.sortOrder,
          active: data.active,
        },
      });
    }

    revalidateEvent(event.id, event.slug);
    return { ok: true, message: data.id ? "Tier saved." : "Tier added." };
  });
}

export async function deleteTicketTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing tier." };

    const tier = await prisma.ticketTier.findUnique({
      where: { id },
      select: {
        eventId: true,
        sold: true,
        held: true,
        event: { select: { slug: true } },
        _count: { select: { tickets: true, orderItems: true } },
      },
    });
    if (!tier) return { ok: false, error: "Tier not found." };
    if (tier.sold > 0 || tier.held > 0 || tier._count.tickets > 0 || tier._count.orderItems > 0) {
      return { ok: false, error: "This tier has sales or holds. Deactivate it instead of deleting." };
    }

    await prisma.ticketTier.delete({ where: { id } });
    revalidateEvent(tier.eventId, tier.event.slug);
    return { ok: true, message: "Tier removed." };
  });
}

export async function resendOrderTickets(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.viewPayments);
    const reference = String(formData.get("reference") ?? "").trim();
    if (!reference) return { ok: false, error: "Missing order reference." };
    const { resendTicketEmail } = await import("@/lib/orders");
    const ok = await resendTicketEmail(reference);
    revalidatePath("/admin/payments");
    return ok
      ? { ok: true, message: "Ticket email sent with the new QR URL." }
      : { ok: false, error: "Could not send. Order must be paid and have tickets." };
  });
}
