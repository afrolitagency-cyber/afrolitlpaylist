"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { eventInput } from "@/lib/validation";
import { uniqueSlug } from "@/lib/services/slug";
import { runAction, type ActionState } from "./_result";

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    const existing = id
      ? await prisma.event.findUnique({ where: { id }, select: { status: true } })
      : null;
    if (id && !existing) return { ok: false, error: "That event no longer exists." };

    const requested = String(formData.get("status") ?? "");
    const intent = String(formData.get("intent") ?? "");
    let status: "DRAFT" | "PENDING" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
    if (actor.role === "EDITOR") {
      if (existing?.status === "PUBLISHED") status = "PUBLISHED";
      else if (intent === "review" || requested === "PENDING") status = "PENDING";
      else if (intent === "draft" || requested === "DRAFT" || requested === "") status = "DRAFT";
      else return { ok: false, error: "An admin has to approve this event before it is published." };
    } else if (requested === "DRAFT" || requested === "PENDING" || requested === "SCHEDULED" || requested === "PUBLISHED" || requested === "ARCHIVED") {
      status = requested;
    } else {
      status = "DRAFT";
    }

    const scheduleLines = String(formData.get("schedule") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [time, title, note] = line.split("|").map((p) => p.trim());
        return { time: time || "", title: title || time || "", ...(note ? { note } : {}) };
      });

    const data = eventInput.parse({
      title: formData.get("title"),
      slug: formData.get("slug") || undefined,
      description: formData.get("description") || null,
      startsAt: formData.get("startsAt"),
      doorsAt: formData.get("doorsAt") || null,
      timezone: formData.get("timezone") || "Africa/Lagos",
      venue: formData.get("venue") || null,
      address: formData.get("address") || null,
      country: formData.get("country") || null,
      city: formData.get("city") || null,
      eventType: formData.get("eventType") || null,
      ageLimit: formData.get("ageLimit") || null,
      schedule: scheduleLines,
      seriesId: formData.get("seriesId") || null,
      lineupArtistIds: formData.getAll("lineupArtistIds").map(String).filter(Boolean),
      registrationOpen: formData.get("registrationOpen") === "on",
      registrationUrl: formData.get("registrationUrl") || null,
      ticketed: formData.get("ticketed") === "on",
      priceFrom: formData.get("priceFrom") ? Number(formData.get("priceFrom")) : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      soldOut: formData.get("soldOut") === "on",
      presentedBy: formData.get("presentedBy") || null,
      presentedByArtistId: formData.get("presentedByArtistId") || null,
      hostContact: formData.get("hostContact") || null,
      hostShareBps: formData.get("hostSharePercent")
        ? Math.min(100, Math.max(0, Math.trunc(Number(formData.get("hostSharePercent"))))) * 100
        : 0,
      settlementNote: formData.get("settlementNote") || null,
      status,
      coverImage: formData.get("coverImage") || null,
    });

    const slug = await uniqueSlug("event", data.slug || data.title, id || undefined);
    const { lineupArtistIds, seriesId, presentedByArtistId, ...rest } = data;
    const lineup = lineupArtistIds.map((artistId) => ({ id: artistId }));

    // Prisma forbids mixing a raw foreign key (seriesId) with relation writes (lineup),
    // so the series goes through the relation too.
    const event = id
      ? await prisma.event.update({
          where: { id },
          data: {
            ...rest,
            slug,
            ...(status === "PUBLISHED" ? { reviewNote: null } : {}),
            lineup: { set: lineup },
            series: seriesId ? { connect: { id: seriesId } } : { disconnect: true },
            presentedByArtist: presentedByArtistId
              ? { connect: { id: presentedByArtistId } }
              : { disconnect: true },
          },
        })
      : await prisma.event.create({
          data: {
            ...rest,
            slug,
            ...(status === "PUBLISHED" ? { reviewNote: null } : {}),
            lineup: { connect: lineup },
            ...(seriesId ? { series: { connect: { id: seriesId } } } : {}),
            ...(presentedByArtistId
              ? { presentedByArtist: { connect: { id: presentedByArtistId } } }
              : {}),
          },
        });

    revalidateTag("events");
    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath("/");
    revalidatePath(`/events/${event.slug}`);
    if (event.seriesId) revalidatePath("/", "layout"); // the nav dropdown is built from series events
    const publishing = status === "PUBLISHED";
    const submitted = status === "PENDING";
    return {
      ok: true,
      message: publishing
        ? "Event published."
        : submitted
          ? "Sent for review. An admin will approve it before it goes live."
          : "Event saved.",
    };
  });
}

const seriesSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  showInNav: z.boolean().default(false),
});

export async function saveSeries(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const data = seriesSchema.parse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
      description: formData.get("description") || null,
      coverImage: formData.get("coverImage") || null,
      showInNav: formData.get("showInNav") === "on",
    });

    const slug = await uniqueSlug("eventSeries", data.slug || data.name, data.id);
    const payload = {
      name: data.name,
      slug,
      description: data.description,
      coverImage: data.coverImage,
      showInNav: data.showInNav,
    };

    if (data.id) await prisma.eventSeries.update({ where: { id: data.id }, data: payload });
    else await prisma.eventSeries.create({ data: payload });

    revalidatePath("/admin/events/series");
    revalidatePath("/", "layout"); // nav is data-driven
    return { ok: true, message: "Series saved." };
  });
}

export async function reviewEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh("SUPERADMIN", "ADMIN");
    const id = String(formData.get("id") ?? "");
    const decision = String(formData.get("decision") ?? "");
    const event = await prisma.event.findUnique({ where: { id }, select: { id: true, slug: true, seriesId: true } });
    if (!event) return { ok: false, error: "That event no longer exists." };

    if (decision === "approve") {
      await prisma.event.update({ where: { id }, data: { status: "PUBLISHED", reviewNote: null } });
    } else if (decision === "return") {
      const note = String(formData.get("reviewNote") ?? "").trim();
      if (note.length < 3) return { ok: false, error: "Tell the editor what to change." };
      await prisma.event.update({ where: { id }, data: { status: "DRAFT", reviewNote: note } });
    } else {
      return { ok: false, error: "Unknown action." };
    }

    revalidateTag("events");
    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath("/");
    revalidatePath(`/events/${event.slug}`);
    if (event.seriesId) revalidatePath("/", "layout");
    return { ok: true, message: decision === "approve" ? "Event published." : "Sent back to the editor." };
  });
}
