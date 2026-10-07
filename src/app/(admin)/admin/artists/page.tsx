import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ArtistStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const TABS = ["ALL", "PENDING", "CHANGES_REQUESTED", "LIVE", "DRAFT"] as const;

export default async function AdminArtists({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await requireRole(...can.manageContent);
  const active = (TABS as readonly string[]).includes(status ?? "") ? (status as string) : "ALL";

  const [artists, counts] = await Promise.all([
    prisma.artist.findMany({
      where: active === "ALL" ? {} : { status: active as ArtistStatus },
      orderBy: [{ submittedAt: "desc" }, { name: "asc" }],
      take: 200,
      select: {
        id: true, name: true, genre: true, status: true, submittedAt: true,
        user: { select: { email: true } },
        _count: { select: { discography: true } },
      },
    }),
    prisma.artist.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: string) =>
    s === "ALL"
      ? counts.reduce((n: number, c: { _count: number }) => n + c._count, 0)
      : (counts.find((c: { status: string }) => c.status === s)?._count ?? 0);

  return (
    <AdminShell role={user.role} email={user.email} title="Artists" subtitle="Profiles, submissions and invites"
      actions={<Link href="/admin/artists/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">+ New artist</Link>}>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={t === "ALL" ? "/admin/artists" : `/admin/artists?status=${t}`}
            className={`rounded border px-4 py-2 text-[13.5px] font-semibold capitalize ${
              active === t ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text) hover:text-(--body-text)"
            }`}>
            {t.replace(/_/g, " ").toLowerCase()} ({countOf(t)})
          </Link>
        ))}
      </div>

      {artists.length === 0 ? (
        <EmptyState title="No artists here"
          body={active === "ALL" ? "Create a profile here, or invite someone from Users and let them fill it in." : "Nothing with this status right now."}
          action={active === "ALL" ? { href: "/admin/artists/new", label: "New artist" } : undefined} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
          {artists.map((a: {
            id: string; name: string; genre: string | null; status: string; submittedAt: Date | null;
            user: { email: string } | null; _count: { discography: number };
          }) => (
            <div key={a.id} className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm">{a.name}</b>
                <span className="text-xs text-(--sub-text)">
                  {a.genre ?? "—"} · {a.user?.email ?? "Unclaimed"} · {a._count.discography} releases
                </span>
              </div>
              <span className="hidden text-xs text-(--sub-text) sm:block">
                {a.submittedAt ? a.submittedAt.toLocaleDateString("en-GB") : "—"}
              </span>
              <StatusPill status={a.status} />
              <Link href={`/admin/artists/${a.id}`}
                className="rounded border border-(--border-strong) px-3.5 py-1.5 text-xs font-bold">Edit</Link>
              <Link href={`/admin/artists/${a.id}/media`}
                className="rounded border border-(--border-strong) px-3.5 py-1.5 text-xs font-bold">Moments</Link>
              {["PENDING", "CHANGES_REQUESTED"].includes(a.status) ? (
                <Link href={`/admin/artists/${a.id}/review`}
                  className="rounded bg-(--primary) px-3.5 py-1.5 text-xs font-bold text-white">Review</Link>
              ) : (
                <Link href={`/admin/artists/${a.id}/review`}
                  className="rounded border border-(--border-strong) px-3.5 py-1.5 text-xs font-bold">Open</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
