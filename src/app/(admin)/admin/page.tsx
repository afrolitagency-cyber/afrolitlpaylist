import Link from "next/link";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";

export const dynamic = "force-dynamic"; // admin is never cached

export default async function AdminDashboard() {
  const user = await requireRole(...can.manageContent);
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, artistAccess: true },
  });
  const artistAccess = fresh?.role === "SUPERADMIN" || (fresh?.role === "ADMIN" && Boolean(fresh.artistAccess));

  const [pendingArtists, pendingComments, drafts, pendingEvents, submissions, eventsWaiting] = await Promise.all([
    prisma.artist.count({ where: { status: "PENDING" } }),
    prisma.comment.count({ where: { status: "PENDING" } }),
    prisma.post.count({ where: { status: "DRAFT" } }),
    prisma.event.count({ where: { status: "PENDING" } }),
    prisma.artist.findMany({
      where: { status: { in: ["PENDING", "CHANGES_REQUESTED"] } },
      orderBy: { submittedAt: "desc" },
      take: 6,
      select: { id: true, name: true, genre: true, status: true, submittedAt: true },
    }),
    prisma.event.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, startsAt: true, city: true, venue: true },
    }),
  ]);

  const queues = [
    { label: "Events waiting", count: pendingEvents, href: "/admin/events", hint: "Need approval" },
    ...(artistAccess
      ? [{ label: "Artist submissions", count: pendingArtists, href: "/admin/artists?status=PENDING", hint: "Awaiting review" }]
      : []),
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
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queues.map((q) => (
          <Link key={q.href} href={q.href as Route} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 hover:border-(--primary)">
            <span className="text-sm font-semibold">{q.label}</span>
            <div className="mt-4 text-3xl font-black">{q.count}</div>
            <div className="mt-1 flex items-center justify-between text-sm text-(--sub-text)">
              <span>{q.hint}</span>
              <span className="font-bold text-(--primary)">Open →</span>
            </div>
          </Link>
        ))}
      </div>

      {eventsWaiting.length > 0 ? (
        <>
          <h2 className="mb-4 text-lg font-bold">Events waiting for approval</h2>
          <div className="mb-8 overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
            {eventsWaiting.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <b className="block text-sm">{e.title}</b>
                  <span className="text-xs text-(--sub-text)">
                    {e.startsAt.toLocaleDateString("en-GB")}
                    {e.city || e.venue ? ` · ${[e.city, e.venue].filter(Boolean).join(", ")}` : ""}
                  </span>
                </div>
                <StatusPill status="PENDING" />
                <Link href={`/admin/events/${e.id}`} className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold hover:border-(--primary)">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {artistAccess ? (
        <>
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
        </>
      ) : null}
    </AdminShell>
  );
}
