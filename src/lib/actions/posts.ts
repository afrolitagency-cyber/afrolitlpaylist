"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { postInput } from "@/lib/validation";
import { uniqueSlug } from "@/lib/services/slug";
import { runAction, type ActionState } from "./_result";
import type { Prisma } from "@prisma/client";

function parse(formData: FormData) {
  return postInput.parse({
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    excerpt: formData.get("excerpt") || null,
    body: formData.get("body") ? JSON.parse(String(formData.get("body"))) : undefined,
    coverImage: formData.get("coverImage") || null,
    categoryId: formData.get("categoryId") || null,
    artistId: formData.get("artistId") || null,
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    status: formData.get("status"),
    publishedAt: formData.get("publishedAt") || null,
    featured: formData.get("featured") === "on",
    commentsOn: formData.get("commentsOn") !== "off",
  });
}

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    const publishing = formData.get("status") === "PUBLISHED";

    // publishing is sensitive — check the database, not the token
    const user = publishing
      ? await requireRoleFresh(...can.manageContent)
      : await requireRole(...can.manageContent);

    const data = parse(formData);
    const slug = await uniqueSlug("post", data.slug || data.title, id || undefined);

    const payload = {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      body: (data.body ?? undefined) as Prisma.InputJsonValue | undefined,
      coverImage: data.coverImage,
      categoryId: data.categoryId,
      artistId: data.artistId,
      tags: data.tags,
      status: data.status,
      featured: data.featured,
      commentsOn: data.commentsOn,
      publishedAt: publishing ? (data.publishedAt ?? new Date()) : data.publishedAt,
    };

    const post = id
      ? await prisma.post.update({ where: { id }, data: payload })
      : await prisma.post.create({ data: { ...payload, authorId: user.id } });

    // snapshot on publish — not keystroke history
    if (publishing) {
      await prisma.postRevision.create({
        data: { postId: post.id, authorId: user.id, snapshot: payload as unknown as Prisma.InputJsonValue },
      });
      revalidateTag("posts");
      revalidatePath("/");
      revalidatePath(`/blog/${post.slug}`);
    }

    revalidatePath("/admin/posts");
    return { ok: true, message: publishing ? "Published." : "Saved." };
  });
}

export async function deletePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent); // destructive → fresh check
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing post id." };

    const post = await prisma.post.delete({ where: { id } });
    revalidateTag("posts");
    revalidatePath("/admin/posts");
    revalidatePath(`/blog/${post.slug}`);
    return { ok: true, message: "Deleted." };
  });
}
