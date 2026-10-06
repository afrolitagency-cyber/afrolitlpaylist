"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { eventInput } from "@/lib/validation";
import { uniqueSlug } from "@/lib/services/slug";
import { runAction, type ActionState } from "./_result";

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    const publishing = formData.get("status") === "PUBLISHED";
    if (publishing) await requireRoleFresh(...can.manageContent);
    else await requireRole(...can.manageContent);

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
      seriesId: formData.get("seriesId") || null,
      lineupArtistIds: formData.getAll("lineupArtistIds").map(String).filter(Boolean),
      registrationOpen: formData.get("registrationOpen") === "on",
      registrationUrl: formData.get("registrationUrl") || null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      soldOut: formData.get("soldOut") === "on",
      status: formData.get("status"),
      coverImage: formData.get("coverImage") || null,
    });

    const slug = await uniqueSlug("event", data.slug || data.title, id || undefined);
    const { lineupArtistIds, seriesId, ...rest } = data;
    const lineup = lineupArtistIds.map((artistId) => ({ id: artistId }));

    // Prisma forbids mixing a raw foreign key (seriesId) with relation writes (lineup),
    // so the series goes through the relation too.
    const event = id
      ? await prisma.event.update({
          where: { id },
          data: {
            ...rest,
            slug,
            lineup: { set: lineup },
            series: seriesId ? { connect: { id: seriesId } } : { disconnect: true },
          },
        })
      : await prisma.event.create({
          data: {
            ...rest,
            slug,
            lineup: { connect: lineup },
            ...(seriesId ? { series: { connect: { id: seriesId } } } : {}),
          },
        });

    revalidateTag("events");
    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath("/");
    revalidatePath(`/events/${event.slug}`);
    if (event.seriesId) revalidatePath("/", "layout"); // the nav dropdown is built from series events
    return { ok: true, message: publishing ? "Event published." : "Event saved." };
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
