import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { buildDiff, type PendingProfile } from "@/lib/services/review";

export const dynamic = "force-dynamic";

function render(value: unknown) {
  if (value === null || value === undefined || value === "") return <span className="text-(--sub-text)">—</span>;
  if (typeof value === "object") return <code className="text-xs">{JSON.stringify(value)}</code>;
  return <>{String(value)}</>;
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.reviewArtists);

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      reviewEvents: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { email: true } } } },
    },
  });
  if (!artist) notFound();

  const pending = (artist.pendingProfile ?? {}) as PendingProfile;
  const diff = buildDiff(artist as unknown as Record<string, unknown>, pending);

  return (
    <AdminShell role={user.role} email={user.email} title="Review profile" subtitle={artist.name}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg)">
          <div className="flex items-center gap-3 border-b border-(--border-strong) p-4">
            <div>
              <b className="block">{artist.name}</b>
              <span className="text-xs text-(--sub-text)">
                {artist.submittedAt ? `Submitted ${artist.submittedAt.toLocaleString("en-GB")}` : "No open submission"}
              </span>
            </div>
            <span className="ml-auto"><StatusPill status={artist.status} /></span>
          </div>

          <div className="p-5">
            {artist.reviewNote ? (
              <div className="mb-5 rounded-r border-l-[3px] border-amber-500 bg-(--surface-alt) p-4">
                <b className="text-sm">Your last note</b>
                <p className="mt-1 text-sm text-(--sub-text)">{artist.reviewNote}</p>
              </div>
            ) : null}

            {diff.length === 0 ? (
              <p className="text-sm text-(--sub-text)">No pending changes to review.</p>
            ) : (
              diff.map((d) => (
                <div key={d.field} className="mb-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-(--sub-text)">{d.field}</h4>
                  <div className="grid overflow-hidden rounded-lg border border-(--border-strong) sm:grid-cols-2">
                    <div className="border-b border-(--border-strong) p-4 sm:border-b-0 sm:border-r">
                      <h5 className="mb-2 text-[11px] uppercase tracking-wider text-(--sub-text)">Current (live)</h5>
                      <p className="text-sm">{render(d.before)}</p>
                    </div>
                    <div className="p-4">
                      <h5 className="mb-2 text-[11px] uppercase tracking-wider text-(--sub-text)">Submitted</h5>
                      <p className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-sm">{render(d.after)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}

            <p className="mt-4 text-xs text-(--sub-text)">
              Discography changes are not shown here — artists publish those directly without review.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <h3 className="mb-4 text-[15px] font-bold">Decision</h3>
            <ReviewForm artistId={artist.id} />
          </div>

          <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <h3 className="mb-3 text-[15px] font-bold">Submission history</h3>
            {artist.reviewEvents.length === 0 ? (
              <p className="text-sm text-(--sub-text)">No events yet.</p>
            ) : (
              artist.reviewEvents.map((e: { id: string; decision: string; createdAt: Date; actor: { email: string } | null }) => (
                <div key={e.id} className="border-b border-(--border-strong) py-3 text-sm last:border-0">
                  <b className="block text-[13.5px] capitalize">{e.decision.replace(/_/g, " ").toLowerCase()}</b>
                  <span className="text-xs text-(--sub-text)">
                    {e.createdAt.toLocaleString("en-GB")}
                    {e.actor ? ` · ${e.actor.email}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
