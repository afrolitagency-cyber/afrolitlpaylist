"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { THEME_KEYS } from "@/components/themes/registry";
import { SETTING_KEYS } from "@/lib/settings";
import { createInvite } from "@/lib/services/invite";
import { sendArtistInvite } from "@/lib/services/email";
import { runAction, type ActionState } from "./_result";

export async function moderateComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.moderate);
    const id = String(formData.get("id") ?? "");
    const decision = String(formData.get("decision") ?? "");
    if (!["APPROVED", "REJECTED", "FLAGGED"].includes(decision)) {
      return { ok: false, error: "Unknown decision." };
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { status: decision as "APPROVED" | "REJECTED" | "FLAGGED" },
      select: { post: { select: { slug: true } } },
    });

    revalidatePath("/admin/comments");
    revalidatePath(`/blog/${comment.post.slug}`);
    return { ok: true, message: decision === "APPROVED" ? "Comment published." : "Comment hidden." };
  });
}

export async function setTheme(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageSettings); // changes the whole public site
    const key = String(formData.get("theme") ?? "");
    if (!THEME_KEYS.includes(key as (typeof THEME_KEYS)[number])) {
      return { ok: false, error: "Unknown theme." };
    }

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEYS.theme },
      create: { key: SETTING_KEYS.theme, value: { key } },
      update: { value: { key } },
    });

    // every public page is wrapped by the theme, so the whole site revalidates
    revalidatePath("/", "layout");
    return { ok: true, message: "Theme switched — the public site updates on next load." };
  });
}

const identitySchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200),
  instagram: z.string().url().optional().or(z.literal("")),
  x: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
  tiktok: z.string().url().optional().or(z.literal("")),
});

export async function saveIdentity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageSettings);
    const parsed = identitySchema.parse({
      name: formData.get("name"),
      tagline: formData.get("tagline"),
      instagram: formData.get("instagram") ?? "",
      x: formData.get("x") ?? "",
      youtube: formData.get("youtube") ?? "",
      tiktok: formData.get("tiktok") ?? "",
    });

    const socials = Object.fromEntries(
      (["instagram", "x", "youtube", "tiktok"] as const)
        .map((k) => [k, parsed[k]])
        .filter(([, v]) => Boolean(v)),
    );

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEYS.identity },
      create: { key: SETTING_KEYS.identity, value: { name: parsed.name, tagline: parsed.tagline, socials } },
      update: { value: { name: parsed.name, tagline: parsed.tagline, socials } },
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Site identity saved." };
  });
}

export async function inviteArtist(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.manageUsers);
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const artistId = String(formData.get("artistId") ?? "") || undefined;
    if (!email.includes("@")) return { ok: false, error: "That email doesn't look right." };

    const artist = artistId
      ? await prisma.artist.findUnique({ where: { id: artistId }, select: { name: true } })
      : null;

    const token = await createInvite(email, artistId, actor.id);
    await sendArtistInvite(email, token, artist?.name);

    revalidatePath("/admin/artists");
    revalidateTag("artists");
    return { ok: true, message: `Invite sent to ${email}.` };
  });
}
