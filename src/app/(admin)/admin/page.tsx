import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";

export const dynamic = "force-dynamic"; // admin is never cached

export default async function AdminDashboard() {
  const user = await requireRole(...can.manageContent);

  const [pendingArtists, pendingComments, drafts, submissions] = await Promise.all([
    prisma.artist.count({ where: { status: "PENDING" } }),
    prisma.comment.count({ where: { status: "PENDING" } }),
    prisma.post.count({ where: { status: "DRAFT" } }),
    prisma.artist.findMany({
      where: { status: { in: ["PENDING", "CHANGES_REQUESTED"] } },
      orderBy: { submittedAt: "desc" },
      take: 6,
      select: { id: true, name: true, genre: true, status: true, submittedAt: true },
    }),
  ]);

  const queues = [
    { label: "Artist submissions", count: pendingArtists, href: "/admin/artists?status=PENDING", hint: "Awaiting review" },
    { label: "Comments", count: pendingComments, href: "/admin/comments", hint: "Need moderation" },
    { label: "Unshipped drafts", count: drafts, href: "/admin/posts?status=DRAFT", hint: "Stalled in draft" },
  ];

  return (
    <AdminShell
      role={user.role}
      email={user.email}
      title="Overview"
      subtitle="Editorial operations"
      actions={
        <Link href="/admin/posts/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">
          + New post
        </Link>
      }
    >
      <h2 className="mb-4 text-lg font-bold">Needs your attention</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {queues.map((q) => (
          <Link key={q.href} href={q.href} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 hover:border-(--primary)">
            <span className="text-sm font-semibold">{q.label}</span>
            <div className="mt-4 text-3xl font-black">{q.count}</div>
            <div className="mt-1 flex items-center justify-between text-sm text-(--sub-text)">
              <span>{q.hint}</span>
              <span className="font-bold text-(--primary)">Open →</span>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-bold">Artist submissions</h2>
      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {submissions.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">Nothing waiting. The queue is clear.</p>
        ) : (
          submissions.map((a: { id: string; name: string; genre: string | null; status: string; submittedAt: Date | null }) => (
            <div key={a.id} className="flex items-center gap-4 border-b border-(--border-strong) px-5 py-4 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block text-sm">{a.name}</b>
                <span className="text-xs text-(--sub-text)">{a.genre ?? "—"}</span>
              </div>
              <StatusPill status={a.status} />
              <span className="hidden text-xs text-(--sub-text) sm:block">
                {a.submittedAt ? a.submittedAt.toLocaleDateString("en-GB") : "—"}
              </span>
              <Link href={`/admin/artists/${a.id}/review`} className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold hover:border-(--primary)">
                Review
              </Link>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
