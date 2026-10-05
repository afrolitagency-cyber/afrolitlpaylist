import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { CommentRow, type CommentItem } from "@/components/admin/CommentRow";
import type { ModerationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const TABS = ["PENDING", "APPROVED", "FLAGGED", "REJECTED"] as const;

export default async function CommentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active = (TABS as readonly string[]).includes(status ?? "") ? (status as ModerationStatus) : "PENDING";
  const user = await requireRole(...can.moderate);

  const [comments, counts] = await Promise.all([
    prisma.comment.findMany({
      where: { status: active },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { post: { select: { title: true } } },
    }),
    prisma.comment.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: string) => counts.find((c: { status: string }) => c.status === s)?._count ?? 0;

  const items: CommentItem[] = comments.map((c: {
    id: string; name: string; email: string; body: string; status: string;
    createdAt: Date; post: { title: string };
  }) => ({
    id: c.id, name: c.name, email: c.email, body: c.body, status: c.status,
    createdAt: c.createdAt.toLocaleString("en-GB"), postTitle: c.post.title,
  }));

  return (
    <AdminShell role={user.role} email={user.email} title="Comments" subtitle="Moderation queue">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/comments?status=${t}`}
            className={`rounded border px-4 py-2 text-[13.5px] font-semibold capitalize ${
              active === t ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text)"
            }`}>
            {t.toLowerCase()} ({countOf(t)})
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">Nothing here. The queue is clear.</p>
        ) : (
          items.map((c) => <CommentRow key={c.id} comment={c} />)
        )}
      </div>
    </AdminShell>
  );
}
