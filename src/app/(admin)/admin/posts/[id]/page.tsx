import { notFound } from "next/navigation";
import type { PartialBlock } from "@blocknote/core";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { PostForm, type PostFormValues } from "@/components/admin/PostForm";

export const dynamic = "force-dynamic";

/** datetime-local wants `YYYY-MM-DDTHH:mm`, not an ISO string with seconds. */
function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK: PostFormValues = {
  title: "", slug: "", excerpt: "", body: null, coverImage: "",
  categoryId: "", artistId: "", tags: "", status: "DRAFT",
  publishedAt: "", featured: false, commentsOn: true,
};

export default async function PostEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.manageContent);
  const isNew = id === "new";

  const [post, categories, artists] = await Promise.all([
    isNew ? null : prisma.post.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.artist.findMany({ orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
  ]);

  if (!isNew && !post) notFound();

  const values: PostFormValues = post
    ? {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        body: (post.body as PartialBlock[] | null) ?? null,
        coverImage: post.coverImage ?? "",
        categoryId: post.categoryId ?? "",
        artistId: post.artistId ?? "",
        tags: post.tags.join(", "),
        status: post.status,
        publishedAt: forInput(post.publishedAt),
        featured: post.featured,
        commentsOn: post.commentsOn,
      }
    : BLANK;

  return (
    <AdminShell
      role={user.role}
      email={user.email}
      title={isNew ? "New post" : "Edit post"}
      subtitle={post?.title ?? "Draft"}
    >
      <PostForm values={values} categories={categories} artists={artists} />
    </AdminShell>
  );
}
