"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnArtist, requireSession } from "@/lib/rbac";
import { acceptInvite } from "@/lib/services/invite";
import { runAction, type ActionState } from "./_result";

const releaseInput = z.object({
  id: z.string().cuid().optional(),
  artistId: z.string().cuid(),
  title: z.string().min(1).max(200),
  type: z.enum(["SINGLE", "EP", "ALBUM", "MIXTAPE"]),
  releaseDate: z.coerce.date().optional().nullable(),
  coverArt: z.string().url().optional().nullable(),
  streamUrl: z.string().url().optional().nullable(),
});

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const token = String(formData.get("token") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) return { ok: false, error: "The two passwords don't match." };

    await acceptInvite(token, password, String(formData.get("name") ?? "") || undefined);
    return { ok: true, message: "Account created. Please sign in." };
  });
  if (result?.ok) redirect("/portal/login");
  return result;
}

/**
 * Discography publishes immediately — no review. Ownership is still checked on
 * every write, and admin can unpublish any row as the safety valve.
 */
export async function saveRelease(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const data = releaseInput.parse({
      id: formData.get("id") || undefined,
      artistId: formData.get("artistId"),
      title: formData.get("title"),
      type: formData.get("type"),
      releaseDate: formData.get("releaseDate") || null,
      coverArt: formData.get("coverArt") || null,
      streamUrl: formData.get("streamUrl") || null,
    });

    await requireOwnArtist(data.artistId);

    const payload = {
      title: data.title,
      type: data.type,
      releaseDate: data.releaseDate,
      coverArt: data.coverArt,
      streamUrl: data.streamUrl,
    };

    if (data.id) {
      // re-check ownership of the row itself, not just the posted artistId
      const existing = await prisma.discography.findUnique({
        where: { id: data.id },
        select: { artistId: true },
      });
      if (!existing || existing.artistId !== data.artistId) {
        return { ok: false, error: "That release doesn't belong to this artist." };
      }
      await prisma.discography.update({ where: { id: data.id }, data: payload });
    } else {
      await prisma.discography.create({ data: { ...payload, artistId: data.artistId } });
    }

    revalidateTag("artists");
    revalidatePath("/portal/discography");
    return { ok: true, message: "Saved — this is live on your page now." };
  });
}

export async function deleteRelease(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    const release = await prisma.discography.findUnique({ where: { id }, select: { artistId: true } });
    if (!release) return { ok: false, error: "Release not found." };

    await requireOwnArtist(release.artistId);
    await prisma.discography.delete({ where: { id } });

    revalidateTag("artists");
    revalidatePath("/portal/discography");
    return { ok: true, message: "Release removed." };
  });
}

/** Convenience for portal pages: the signed-in user's artist row. */
export async function currentArtist() {
  const user = await requireSession();
  return prisma.artist.findUnique({ where: { userId: user.id } });
}
