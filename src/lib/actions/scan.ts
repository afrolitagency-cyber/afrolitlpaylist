"use server";

import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { parseTicketPayload } from "@/lib/ticket-code";
import { runAction, type ActionState } from "./_result";

function when(d: Date) {
  return d.toLocaleString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
}

export async function checkInTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.scanDoor);
    const eventId = String(formData.get("eventId") ?? "").trim();
    const ticketId = String(formData.get("ticketId") ?? "").trim() || null;
    const code = parseTicketPayload(String(formData.get("code") ?? ""));

    const ticket = ticketId
      ? await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { event: { select: { id: true, title: true } }, tier: { select: { name: true, isComp: true } } },
        })
      : code
        ? await prisma.ticket.findUnique({
            where: { code },
            include: { event: { select: { id: true, title: true } }, tier: { select: { name: true, isComp: true } } },
          })
        : null;

    if (!ticket) return { ok: false, error: "Not a valid ticket." };
    if (eventId && ticket.eventId !== eventId) {
      return { ok: false, error: `Wrong event — this ticket is for ${ticket.event.title}.` };
    }
    if (ticket.voidedAt) return { ok: false, error: "Refunded / voided — not valid." };
    if (ticket.usedAt) {
      return { ok: false, error: `Already scanned at ${when(ticket.usedAt)}.` };
    }

    const { count } = await prisma.ticket.updateMany({
      where: { id: ticket.id, usedAt: null, voidedAt: null },
      data: { usedAt: new Date(), usedBy: actor.id },
    });
    if (count !== 1) {
      const again = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      if (again?.usedAt) return { ok: false, error: `Already scanned at ${when(again.usedAt)}.` };
      if (again?.voidedAt) return { ok: false, error: "Refunded / voided — not valid." };
      return { ok: false, error: "Not a valid ticket." };
    }

    revalidatePath("/admin/scan");
    return {
      ok: true,
      message: `Admit · ${ticket.tier.name}${ticket.tier.isComp ? " (comp)" : ""} · ${ticket.holderName ?? "ticket"}`,
    };
  });
}
