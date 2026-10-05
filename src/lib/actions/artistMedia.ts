"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, requireOwnArtist, can } from "@/lib/rbac";
import { runAction, type ActionState } from "./_result";

/** Moments and Stories are EDITOR-curated. Artists never reach these actions —
 *  that boundary is the whole point of keeping them out of the review blob. */

const momentSchema = z.object({
  id: z.string().cuid().optional(),
  artistId: z.string().cuid(),
  mediaUrl: z.string().url(),
  caption: z.string().max(300).optional().nullable(),
  position: z.number().int().min(0).default(0),
});

export async function saveMoment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.manageContent);
    const data = momentSchema.parse({
      id: formData.get("id") || undefined,
      artistId: formData.get("artistId"),
      mediaUrl: formData.get("mediaUrl"),
      caption: formData.get("caption") || null,
      position: Number(formData.get("position") ?? 0),
    });

    const { id, ...payload } = data;
    if (id) await prisma.moment.update({ where: { id }, data: payload });
    else await prisma.moment.create({ data: payload });

    revalidateTag("artists");
    revalidatePath(`/admin/artists/${data.artistId}/media`);
    return { ok: true, message: "Moment saved." };
  });
}

export async function deleteMoment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    const moment = await prisma.moment.delete({ where: { id } });
    revalidateTag("artists");
    revalidatePath(`/admin/artists/${moment.artistId}/media`);
    return { ok: true, message: "Moment removed." };
  });
}

const storySchema = z.object({
  id: z.string().cuid().optional(),
  artistId: z.string().cuid(),
  title: z.string().min(2).max(200),
  coverImage: z.string().url().optional().nullable(),
  bodyText: z.string().max(20_000).optional().nullable(),
  publish: z.boolean().default(false),
});

export async function saveStory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.manageContent);
    const data = storySchema.parse({
      id: formData.get("id") || undefined,
      artistId: formData.get("artistId"),
      title: formData.get("title"),
      coverImage: formData.get("coverImage") || null,
      bodyText: formData.get("bodyText") || null,
      publish: formData.get("publish") === "on",
    });

    // stored as block JSON so stories share the post renderer
    const body = data.bodyText
      ? data.bodyText.split(/\n{2,}/).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.trim() }] }))
      : [];

    const payload = {
      artistId: data.artistId,
      title: data.title,
      coverImage: data.coverImage,
      body,
      publishedAt: data.publish ? new Date() : null,
    };

    if (data.id) await prisma.artistStory.update({ where: { id: data.id }, data: payload });
    else await prisma.artistStory.create({ data: payload });

    revalidateTag("artists");
    revalidatePath(`/admin/artists/${data.artistId}/media`);
    return { ok: true, message: data.publish ? "Story published." : "Story saved as draft." };
  });
}

export async function deleteStory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    const story = await prisma.artistStory.delete({ where: { id } });
    revalidateTag("artists");
    revalidatePath(`/admin/artists/${story.artistId}/media`);
    return { ok: true, message: "Story removed." };
  });
}

/** Tracks belong to a release, so the owner check follows the release. */
const trackSchema = z.object({
  id: z.string().cuid().optional(),
  discographyId: z.string().cuid(),
  title: z.string().min(1).max(200),
  durationSec: z.number().int().positive().optional().nullable(),
  position: z.number().int().min(0).default(0),
  streamUrl: z.string().url().optional().nullable(),
});

export async function saveTrack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const data = trackSchema.parse({
      id: formData.get("id") || undefined,
      discographyId: formData.get("discographyId"),
      title: formData.get("title"),
      durationSec: formData.get("durationSec") ? Number(formData.get("durationSec")) : null,
      position: Number(formData.get("position") ?? 0),
      streamUrl: formData.get("streamUrl") || null,
    });

    const release = await prisma.discography.findUnique({
      where: { id: data.discographyId },
      select: { artistId: true },
    });
    if (!release) return { ok: false, error: "That release no longer exists." };
    await requireOwnArtist(release.artistId);

    const { id, ...payload } = data;
    if (id) {
      // confirm the track really belongs to this release before writing
      const existing = await prisma.track.findUnique({ where: { id }, select: { discographyId: true } });
      if (existing?.discographyId !== data.discographyId) {
        return { ok: false, error: "That track doesn't belong to this release." };
      }
      await prisma.track.update({ where: { id }, data: payload });
    } else {
      await prisma.track.create({ data: payload });
    }

    revalidateTag("artists");
    revalidatePath("/portal/discography");
    return { ok: true, message: "Track saved." };
  });
}

export async function deleteTrack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    const track = await prisma.track.findUnique({
      where: { id },
      select: { discography: { select: { artistId: true } } },
    });
    if (!track) return { ok: false, error: "Track not found." };

    await requireOwnArtist(track.discography.artistId);
    await prisma.track.delete({ where: { id } });

    revalidateTag("artists");
    revalidatePath("/portal/discography");
    return { ok: true, message: "Track removed." };
  });
}
