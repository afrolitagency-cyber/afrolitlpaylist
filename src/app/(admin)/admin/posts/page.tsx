import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";
import type { ContentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS = ["ALL", "PUBLISHED", "DRAFT", "SCHEDULED", "PENDING"] as const;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const user = await requireRole(...can.manageContent);

  const where = {
    ...(status && status !== "ALL" ? { status: status as ContentStatus } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [posts, counts] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true, title: true, slug: true, status: true, publishedAt: true, viewCount: true,
        category: { select: { name: true } },
        author: { select: { email: true } },
      },
    }),
    prisma.post.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (s: string) =>
    s === "ALL"
      ? counts.reduce((n: number, c: { _count: number }) => n + c._count, 0)
      : (counts.find((c: { status: string }) => c.status === s)?._count ?? 0);

  return (
    <AdminShell
      role={user.role}
      email={user.email}
      title="Posts"
      subtitle="Write, schedule and publish"
      actions={
        <Link href="/admin/posts/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">
          + New post
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/posts" : `/admin/posts?status=${f}`}
            className={`rounded border px-4 py-2 text-[13.5px] font-semibold ${
              (status ?? "ALL") === f
                ? "border-(--primary) bg-(--primary) text-white"
                : "border-(--border-strong) text-(--sub-text) hover:text-(--body-text)"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()} ({countFor(f)})
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {posts.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No posts match this filter.</p>
        ) : (
          posts.map((p: {
            id: string; title: string; status: string; publishedAt: Date | null; viewCount: number;
            category: { name: string } | null; author: { email: string } | null;
          }) => (
            <div key={p.id} className="flex items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/posts/${p.id}`} className="block truncate text-sm font-bold hover:text-(--primary)">
                  {p.title}
                </Link>
                <span className="text-xs text-(--sub-text)">
                  {p.category?.name ?? "Uncategorised"}
                  {p.author ? ` · ${p.author.email}` : ""}
                </span>
              </div>
              <StatusPill status={p.status} />
              <span className="hidden w-24 text-xs text-(--sub-text) sm:block">
                {p.publishedAt ? p.publishedAt.toLocaleDateString("en-GB") : "—"}
              </span>
              <span className="hidden w-16 text-right text-xs text-(--sub-text) md:block">
                {p.viewCount.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
