"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { sendEventRegistration } from "@/lib/services/email";
import { track } from "@/lib/analytics";
import { runAction, type ActionState } from "./_result";

const schema = z.object({
  eventId: z.string().cuid(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  website: z.string().max(0).optional(), // honeypot
});

/**
 * Public event registration. Capacity is enforced inside a transaction —
 * checking the count first and inserting after would let two simultaneous
 * requests both pass the check and oversell the room.
 */
export async function registerForEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const data = schema.parse({
      eventId: formData.get("eventId"),
      name: formData.get("name"),
      email: formData.get("email"),
      website: formData.get("website") ?? "",
    });
    if (data.website) return { ok: true, message: "You're registered — see you there." };

    const limit = await rateLimit(`reg:${data.email.toLowerCase()}`, LIMITS.register.max, LIMITS.register.windowSec);
    if (!limit.ok) return { ok: false, error: "Too many attempts. Try again a little later." };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: {
        id: true, slug: true, title: true, status: true, registrationOpen: true,
        soldOut: true, capacity: true, startsAt: true, venue: true,
      },
    });

    if (!event || event.status !== "PUBLISHED") return { ok: false, error: "That event isn't available." };
    if (!event.registrationOpen || event.soldOut) return { ok: false, error: "Registration is closed for this event." };
    if (event.startsAt.getTime() < Date.now()) return { ok: false, error: "This event has already happened." };

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (event.capacity) {
          const taken = await tx.eventRegistration.count({ where: { eventId: event.id } });
          if (taken >= event.capacity) throw new Error("FULL");
        }
        await tx.eventRegistration.create({
          data: { eventId: event.id, name: data.name, email: data.email.toLowerCase().trim() },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "FULL") {
        await prisma.event.update({ where: { id: event.id }, data: { soldOut: true } });
        revalidatePath(`/events/${event.slug}`);
        return { ok: false, error: "This event just filled up." };
      }
      // unique([eventId, email]) — a repeat submission is not an error worth showing
      return { ok: true, message: "You're already on the list for this one." };
    }

    // after the row commits: a failed email must not undo a valid registration
    await sendEventRegistration(data.email, {
      name: data.name,
      event: event.title,
      date: event.startsAt.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" }),
      venue: event.venue ?? "",
      slug: event.slug,
    });

    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/admin/events");
    void track({ name: "event_register", entityId: event.id, path: `/events/${event.slug}` });
    return { ok: true, message: "You're registered — check your email for the details." };
  });
}
