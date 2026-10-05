"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { uniqueSlug } from "@/lib/services/slug";
import { runAction, type ActionState } from "./_result";

const episodeSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(2).max(200),
  slug: z.string().optional(),
  excerpt: z.string().max(600).optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  durationSec: z.number().int().positive().optional().nullable(),
  season: z.number().int().positive().optional().nullable(),
  number: z.number().int().positive().optional().nullable(),
  spotifyUrl: z.string().url().optional().or(z.literal("")).nullable(),
  appleUrl: z.string().url().optional().or(z.literal("")).nullable(),
  youtubeUrl: z.string().url().optional().or(z.literal("")).nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.coerce.date().optional().nullable(),
  featured: z.boolean().default(false),
  commentsOn: z.boolean().default(true),
});

const num = (v: FormDataEntryValue | null) => (v ? Number(v) : null);

export async function saveEpisode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const publishing = formData.get("status") === "PUBLISHED";
    if (publishing) await requireRoleFresh(...can.manageContent);
    else await requireRole(...can.manageContent);

    const data = episodeSchema.parse({
      id: formData.get("id") || undefined,
      title: formData.get("title"),
      slug: formData.get("slug") || undefined,
      excerpt: formData.get("excerpt") || null,
      audioUrl: formData.get("audioUrl") || null,
      coverImage: formData.get("coverImage") || null,
      durationSec: num(formData.get("durationSec")),
      season: num(formData.get("season")),
      number: num(formData.get("number")),
      spotifyUrl: formData.get("spotifyUrl") || null,
      appleUrl: formData.get("appleUrl") || null,
      youtubeUrl: formData.get("youtubeUrl") || null,
      status: formData.get("status"),
      publishedAt: formData.get("publishedAt") || null,
      featured: formData.get("featured") === "on",
      commentsOn: formData.get("commentsOn") !== "off",
    });

    const slug = await uniqueSlug("episode", data.slug || data.title, data.id);
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      slug,
      publishedAt: publishing ? (data.publishedAt ?? new Date()) : data.publishedAt,
    };

    if (id) await prisma.episode.update({ where: { id }, data: payload });
    else await prisma.episode.create({ data: payload });

    revalidatePath("/admin/episodes");
    revalidatePath("/episodes");
    return { ok: true, message: publishing ? "Episode published." : "Episode saved." };
  });
}
