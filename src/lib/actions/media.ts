"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { runAction, type ActionState } from "./_result";

const imageSchema = z.object({
  id: z.string().cuid().optional(),
  url: z.string().url(),
  caption: z.string().max(300).optional().nullable(),
  credit: z.string().max(160).optional().nullable(),
  altText: z.string().max(300).optional().nullable(),
  collectionId: z.string().cuid().optional().nullable(),
  eventId: z.string().cuid().optional().nullable(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export async function saveGalleryImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.manageContent);
    const data = imageSchema.parse({
      id: formData.get("id") || undefined,
      url: formData.get("url"),
      caption: formData.get("caption") || null,
      credit: formData.get("credit") || null,
      altText: formData.get("altText") || null,
      collectionId: formData.get("collectionId") || null,
      eventId: formData.get("eventId") || null,
      published: formData.get("published") === "on",
      featured: formData.get("featured") === "on",
    });

    const { id, ...payload } = data;
    if (id) await prisma.galleryImage.update({ where: { id }, data: payload });
    else await prisma.galleryImage.create({ data: payload });

    revalidatePath("/admin/gallery");
    revalidatePath("/gallery");
    return { ok: true, message: "Image saved." };
  });
}

export async function deleteGalleryImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    await prisma.galleryImage.delete({ where: { id } });
    revalidatePath("/admin/gallery");
    revalidatePath("/gallery");
    return { ok: true, message: "Image removed from the gallery." };
  });
}

const rememberedSchema = z.object({
  url: z.string().url(),
  publicId: z.string().max(300).optional().nullable(),
  mimeType: z.string().max(120).optional().nullable(),
  bytes: z.number().int().positive().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
});

/** Images the post editor can reuse. Editors only — the library is not public. */
export async function listImageAssets(): Promise<{ id: string; url: string }[]> {
  await requireRole(...can.manageContent);
  return prisma.mediaAsset.findMany({
    where: { kind: "image" },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: { id: true, url: true },
  });
}

/** Keeps a Cloudinary upload in the library after the editor inserts it. */
export async function rememberUpload(input: z.input<typeof rememberedSchema>): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireRole(...can.manageContent);
    const data = rememberedSchema.parse(input);
    await prisma.mediaAsset.create({
      data: {
        url: data.url,
        publicId: data.publicId || null,
        kind: "image",
        mimeType: data.mimeType || null,
        bytes: data.bytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        uploadedById: user.id,
      },
    });
    revalidatePath("/admin/media");
    return { ok: true, message: "Added to the media library." };
  });
}

export async function recordUpload(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireRole(...can.manageContent);
    const url = String(formData.get("url") ?? "");
    if (!url) return { ok: false, error: "No file was uploaded." };

    await prisma.mediaAsset.create({
      data: {
        url,
        kind: String(formData.get("kind") ?? "image"),
        mimeType: String(formData.get("mimeType") ?? "") || null,
        uploadedById: user.id,
      },
    });

    revalidatePath("/admin/media");
    return { ok: true, message: "Added to the media library." };
  });
}
