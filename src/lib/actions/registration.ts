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
  optIn: z.boolean().default(false),
  waitlist: z.boolean().default(false),
  website: z.string().max(0).optional(),
});

/**
 * Public event registration or waitlist sign-up. Capacity is enforced inside
 * a transaction so two simultaneous requests cannot oversell the room.
 */
export async function registerForEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const data = schema.parse({
      eventId: formData.get("eventId"),
      name: formData.get("name"),
      email: formData.get("email"),
      optIn: formData.get("optIn") === "on",
      waitlist: formData.get("waitlist") === "1",
      website: formData.get("website") ?? "",
    });
    if (data.website) {
      return {
        ok: true,
        message: data.waitlist ? "You’re on the waitlist." : "You’re registered — see you there.",
      };
    }

    const limit = await rateLimit(`reg:${data.email.toLowerCase()}`, LIMITS.register.max, LIMITS.register.windowSec);
    if (!limit.ok) return { ok: false, error: "Too many attempts. Try again a little later." };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: {
        id: true, slug: true, title: true, status: true, registrationOpen: true,
        soldOut: true, capacity: true, startsAt: true, venue: true, ticketed: true,
        registrationUrl: true,
      },
    });

    if (!event || event.status !== "PUBLISHED") return { ok: false, error: "That event isn't available." };
    if (event.startsAt.getTime() < Date.now()) return { ok: false, error: "This event has already happened." };

    const email = data.email.toLowerCase().trim();

    if (data.waitlist) {
      if (!event.soldOut) return { ok: false, error: "This event still has places — register instead." };
      try {
        await prisma.eventRegistration.create({
          data: { eventId: event.id, name: data.name, email, optIn: data.optIn, waitlist: true },
        });
      } catch {
        return { ok: true, message: `We’ll email ${email} if a place opens up.` };
      }
      revalidatePath(`/events/${event.slug}`);
      revalidatePath("/admin/events");
      void track({ name: "event_register", entityId: event.id, path: `/events/${event.slug}`, label: "waitlist" });
      return { ok: true, message: `We’ll email ${email} if a place opens up.` };
    }

    if (event.ticketed && event.registrationUrl) {
      return { ok: false, error: "Tickets for this event are sold on an external site." };
    }
    if (!event.registrationOpen || event.soldOut) {
      return { ok: false, error: "Registration is closed for this event." };
    }

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (event.capacity) {
          const taken = await tx.eventRegistration.count({
            where: { eventId: event.id, waitlist: false },
          });
          if (taken >= event.capacity) throw new Error("FULL");
        }
        await tx.eventRegistration.create({
          data: { eventId: event.id, name: data.name, email, optIn: data.optIn, waitlist: false },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "FULL") {
        await prisma.event.update({ where: { id: event.id }, data: { soldOut: true } });
        revalidatePath(`/events/${event.slug}`);
        return { ok: false, error: "This event just filled up." };
      }
      return { ok: true, message: "You’re already on the list for this one." };
    }

    await sendEventRegistration(email, {
      name: data.name,
      event: event.title,
      date: event.startsAt.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" }),
      venue: event.venue ?? "",
      slug: event.slug,
    });

    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/admin/events");
    void track({ name: "event_register", entityId: event.id, path: `/events/${event.slug}` });
    return {
      ok: true,
      message: `See you at ${event.title}. A confirmation was sent to ${email}.`,
    };
  });
}
