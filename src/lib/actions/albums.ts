"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { albumInput } from "@/lib/validation";
import { uniqueSlug } from "@/lib/services/slug";
import { PLATFORMS } from "@/lib/album-platforms";
import { THEME_KEYS } from "@/components/themes/registry";
import { ALBUM_STYLES, SETTING_KEYS, type AlbumStyle } from "@/lib/settings";
import { runAction, type ActionState } from "./_result";

function intOrNull(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? "").replace(/^\+/, "").trim());
  return String(value ?? "").trim() !== "" && Number.isFinite(n) ? Math.trunc(n) : null;
}

function revalidateAlbums(slug?: string) {
  revalidatePath("/");
  revalidatePath("/albums");
  revalidatePath("/admin/albums");
  if (slug) revalidatePath(`/albums/${slug}`);
}

export async function saveAlbum(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId = null as string | null;
  const result = await runAction(async () => {
    const id = String(formData.get("id") ?? "");
    const published = formData.get("published") === "true";
    if (published) await requireRoleFresh(...can.manageContent);
    else await requireRole(...can.manageContent);

    const links: Record<string, string> = {};
    for (const p of PLATFORMS) {
      const raw = String(formData.get(`link_${p.key}`) ?? "").trim();
      if (raw) links[p.key] = /^https?:\/\//i.test(raw) ? raw.replace(/^http:\/\//i, "https://") : `https://${raw}`;
    }

    const parsed = albumInput.safeParse({
      title: String(formData.get("title") ?? "").trim(),
      artistName: String(formData.get("artistName") ?? "").trim(),
      artistId: formData.get("artistId") || null,
      releaseYear: intOrNull(formData.get("releaseYear")),
      genre: String(formData.get("genre") ?? "").trim() || null,
      summary: String(formData.get("summary") ?? "").trim() || null,
      about: String(formData.get("about") ?? "").trim() || null,
      tracks: String(formData.get("tracks") ?? "").split("\n").map((t) => t.trim()).filter(Boolean),
      coverImage: formData.get("coverImage") || null,
      links,
      rank: intOrNull(formData.get("rank")) ?? 99,
      movement: intOrNull(formData.get("movement")) ?? 0,
      published,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const which =
        field === "links" ? "One of the listen links isn't a valid web address." :
        field === "title" ? "Add the album title." :
        field === "artistName" ? "Add the artist name." :
        field === "rank" ? "Chart position must be 1 or more." :
        "Please check the highlighted fields.";
      return { ok: false, error: which, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    const data = parsed.data;

    const fields = {
      ...data,
      links: data.links as Prisma.InputJsonValue,
    };

    const album = id
      ? await prisma.album.update({ where: { id }, data: fields })
      : await prisma.album.create({ data: { ...fields, slug: await uniqueSlug("album", `${data.title} ${data.artistName}`) } });

    revalidateAlbums(album.slug);
    if (!id) createdId = album.id;
    return { ok: true, message: published ? "Album saved and live on the chart." : "Album saved as a draft." };
  });
  if (createdId) redirect(`/admin/albums/${createdId}?created=1`);
  return result;
}

/** Each homepage template keeps its own Trending Albums layout. */
export async function saveAlbumStyles(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageSettings);
    const value: Record<string, AlbumStyle> = {};
    for (const theme of THEME_KEYS) {
      const style = String(formData.get(`style_${theme}`) ?? "");
      if (!ALBUM_STYLES.includes(style as AlbumStyle)) return { ok: false, error: "Pick a layout for every template." };
      value[theme] = style as AlbumStyle;
    }

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEYS.albumStyle },
      create: { key: SETTING_KEYS.albumStyle, value },
      update: { value },
    });

    revalidatePath("/");
    revalidatePath("/admin/albums");
    return { ok: true, message: "Album layouts saved. The homepage updates on next load." };
  });
}

export async function deleteAlbum(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    const album = await prisma.album.delete({ where: { id }, select: { slug: true } });
    revalidateAlbums(album.slug);
    return { ok: true, message: "Album deleted." };
  });
  if (result?.ok) redirect("/admin/albums");
  return result;
}
