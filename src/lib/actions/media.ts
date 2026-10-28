"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { cloudinaryTarget, destroyCloudinaryAsset } from "@/lib/cloudinary";
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

/** Images already uploaded. Editors see the shared library; artists see only their own. */
export async function listImageAssets(): Promise<{ id: string; url: string }[]> {
  const user = await requireRole(...can.manageContent, "ARTIST");
  return prisma.mediaAsset.findMany({
    where: { kind: "image", ...(user.role === "ARTIST" ? { uploadedById: user.id } : {}) },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: { id: true, url: true },
  });
}

/** Keeps a Cloudinary upload in the library after the editor inserts it. */
export async function rememberUpload(input: z.input<typeof rememberedSchema>): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireRole(...can.manageContent, "ARTIST");
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

    const kind = String(formData.get("kind") ?? "image");
    await prisma.mediaAsset.create({
      data: {
        url,
        publicId: cloudinaryTarget(url, kind, null)?.publicId ?? null,
        kind,
        mimeType: String(formData.get("mimeType") ?? "") || null,
        uploadedById: user.id,
      },
    });

    revalidatePath("/admin/media");
    return { ok: true, message: "Added to the media library." };
  });
}

/** Drops the library row and the Cloudinary file when no live page still uses it. */
export async function deleteMediaAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true, url: true, publicId: true, kind: true },
    });
    if (!asset) return { ok: false, error: "That file is already gone." };

    const used = await mediaInUse(asset.url, asset.publicId);
    if (used) return { ok: false, error: `This file is still used on ${used}. Remove it there first.` };

    const target = cloudinaryTarget(asset.url, asset.kind, asset.publicId);
    if (asset.url.includes("res.cloudinary.com") && !target) {
      return { ok: false, error: "This file is on Cloudinary, but its id could not be read." };
    }
    if (target) {
      const removed = await destroyCloudinaryAsset(target.publicId, target.resource);
      if (!removed.ok) return removed;
    }

    await prisma.mediaAsset.delete({ where: { id } });
    revalidatePath("/admin/media");
    return {
      ok: true,
      message: target ? "File deleted. The space on Cloudinary is freed." : "Removed from the library.",
    };
  });
}

async function mediaInUse(url: string, publicId: string | null): Promise<string | null> {
  const needle = publicId && publicId.length > 8 ? publicId : null;
  const [post, event, series, artist, story, album, release, moment, episode, gallery, ad, setting] = await Promise.all([
    prisma.post.findFirst({
      where: {
        OR: [
          { coverImage: url },
          { body: { string_contains: url } },
          ...(needle ? [{ coverImage: { contains: needle } }, { body: { string_contains: needle } }] : []),
        ],
      },
      select: { id: true },
    }),
    prisma.event.findFirst({
      where: { OR: [{ coverImage: url }, ...(needle ? [{ coverImage: { contains: needle } }] : [])] },
      select: { id: true },
    }),
    prisma.eventSeries.findFirst({
      where: { OR: [{ coverImage: url }, ...(needle ? [{ coverImage: { contains: needle } }] : [])] },
      select: { id: true },
    }),
    prisma.artist.findFirst({
      where: {
        OR: [
          { coverImage: url },
          { avatarImage: url },
          { pendingProfile: { string_contains: url } },
          ...(needle
            ? [
                { coverImage: { contains: needle } },
                { avatarImage: { contains: needle } },
                { pendingProfile: { string_contains: needle } },
              ]
            : []),
        ],
      },
      select: { id: true },
    }),
    prisma.artistStory.findFirst({
      where: {
        OR: [
          { coverImage: url },
          { body: { string_contains: url } },
          ...(needle ? [{ coverImage: { contains: needle } }, { body: { string_contains: needle } }] : []),
        ],
      },
      select: { id: true },
    }),
    prisma.album.findFirst({
      where: { OR: [{ coverImage: url }, ...(needle ? [{ coverImage: { contains: needle } }] : [])] },
      select: { id: true },
    }),
    prisma.discography.findFirst({
      where: { OR: [{ coverArt: url }, ...(needle ? [{ coverArt: { contains: needle } }] : [])] },
      select: { id: true },
    }),
    prisma.moment.findFirst({
      where: { OR: [{ mediaUrl: url }, ...(needle ? [{ mediaUrl: { contains: needle } }] : [])] },
      select: { id: true },
    }),
    prisma.episode.findFirst({
      where: {
        OR: [
          { audioUrl: url },
          { coverImage: url },
          ...(needle ? [{ audioUrl: { contains: needle } }, { coverImage: { contains: needle } }] : []),
        ],
      },
      select: { id: true },
    }),
    prisma.galleryImage.findFirst({
      where: { OR: [{ url }, ...(needle ? [{ url: { contains: needle } }] : [])] },
      select: { id: true },
    }),
    prisma.adCreative.findFirst({
      where: {
        OR: [
          { imageUrl: url },
          { imageUrlMobile: url },
          { thumbUrl: url },
          ...(needle
            ? [
                { imageUrl: { contains: needle } },
                { imageUrlMobile: { contains: needle } },
                { thumbUrl: { contains: needle } },
              ]
            : []),
        ],
      },
      select: { id: true },
    }),
    prisma.siteSetting.findFirst({
      where: {
        OR: [{ value: { string_contains: url } }, ...(needle ? [{ value: { string_contains: needle } }] : [])],
      },
      select: { key: true },
    }),
  ]);

  if (post) return "a post";
  if (event || series) return "an event";
  if (artist || story || album || release || moment) return "an artist page";
  if (episode) return "an episode";
  if (gallery) return "the gallery";
  if (ad) return "an ad";
  if (setting) return "the site settings";
  return null;
}
