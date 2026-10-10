import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

type SlugModel = "post" | "event" | "episode" | "artist" | "eventSeries" | "album";

/** Appends -2, -3 … until free. `ignoreId` lets a row keep its own slug on edit. */
export async function uniqueSlug(model: SlugModel, desired: string, ignoreId?: string) {
  const base = slugify(desired) || "untitled";
  let candidate = base;
  for (let n = 2; n < 100; n++) {
    const delegate = prisma[model] as unknown as {
      findUnique(args: { where: { slug: string }; select: { id: true } }): Promise<{ id: string } | null>;
    };
    const existing = await delegate.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}
