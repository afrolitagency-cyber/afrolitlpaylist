"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { slugify } from "@/lib/services/slug";
import { TEMPLATE_DEFAULTS, type TemplateKey } from "@/lib/services/email";
import { runAction, type ActionState } from "./_result";

const nameSchema = z.object({ id: z.string().cuid().optional(), name: z.string().min(1).max(80), slug: z.string().optional() });

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.manageContent);
    const data = nameSchema.parse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
    });

    const finalSlug = slugify(data.slug || data.name);

    if (data.id) await prisma.category.update({ where: { id: data.id }, data: { name: data.name, slug: finalSlug } });
    else await prisma.category.create({ data: { name: data.name, slug: finalSlug } });

    revalidateTag("posts");
    revalidatePath("/admin/taxonomy");
    revalidatePath("/blog");
    return { ok: true, message: "Category saved." };
  });
}

export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");

    // posts keep existing with categoryId set null (onDelete: SetNull), but say so
    const count = await prisma.post.count({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });

    revalidatePath("/admin/taxonomy");
    revalidatePath("/blog");
    return {
      ok: true,
      message: count > 0 ? `Category removed. ${count} post${count === 1 ? "" : "s"} are now uncategorised.` : "Category removed.",
    };
  });
}

export async function saveCollection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.manageContent);
    const data = nameSchema.parse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
    });
    const slug = slugify(data.slug || data.name);

    if (data.id) await prisma.galleryCollection.update({ where: { id: data.id }, data: { name: data.name, slug } });
    else await prisma.galleryCollection.create({ data: { name: data.name, slug } });

    revalidatePath("/admin/taxonomy");
    revalidatePath("/gallery");
    return { ok: true, message: "Collection saved." };
  });
}

export async function deleteCollection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("id") ?? "");
    const count = await prisma.galleryImage.count({ where: { collectionId: id } });
    await prisma.galleryCollection.delete({ where: { id } });

    revalidatePath("/admin/taxonomy");
    revalidatePath("/gallery");
    return {
      ok: true,
      message: count > 0 ? `Collection removed. ${count} image${count === 1 ? "" : "s"} kept, now uncollected.` : "Collection removed.",
    };
  });
}

const templateSchema = z.object({
  key: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
});

export async function saveEmailTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageSettings);
    const data = templateSchema.parse({
      key: formData.get("key"),
      subject: formData.get("subject"),
      body: formData.get("body"),
    });

    if (!(data.key in TEMPLATE_DEFAULTS)) return { ok: false, error: "Unknown template." };
    const name = TEMPLATE_DEFAULTS[data.key as TemplateKey].name;

    await prisma.emailTemplate.upsert({
      where: { key: data.key },
      create: { key: data.key, name, subject: data.subject, body: data.body },
      update: { subject: data.subject, body: data.body },
    });

    revalidatePath("/admin/emails");
    return { ok: true, message: "Template saved. New sends use it immediately." };
  });
}

export async function resetEmailTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageSettings);
    const key = String(formData.get("key") ?? "");
    await prisma.emailTemplate.deleteMany({ where: { key } }); // falls back to built-in copy
    revalidatePath("/admin/emails");
    return { ok: true, message: "Reverted to the built-in template." };
  });
}
