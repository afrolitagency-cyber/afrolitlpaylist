import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell, StatusPill } from "@/components/admin/Shell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PLATFORMS, platformLabel } from "@/lib/album-platforms";
import { AlbumStyleForm } from "@/components/admin/AlbumStyleForm";
import { THEME_KEYS, THEME_META } from "@/components/themes/registry";
import { getActiveTheme, getAlbumStyles } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** The editorial chart plus outbound "Listen on" clicks from the last 30 days. */
export default async function AdminAlbums() {
  const user = await requireRole(...can.manageContent);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [albums, clickRows, albumStyles, activeTheme] = await Promise.all([
    prisma.album.findMany({
      orderBy: [{ published: "desc" }, { rank: "asc" }, { updatedAt: "desc" }],
      select: { id: true, title: true, artistName: true, rank: true, movement: true, published: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId", "label"],
      where: { name: "album_listen_click", isBot: false, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    getAlbumStyles(),
    getActiveTheme(),
  ]);

  const byAlbum = new Map<string, { total: number; by: Record<string, number> }>();
  const byPlatform: Record<string, number> = {};
  for (const row of clickRows) {
    if (!row.entityId || !row.label) continue;
    const entry = byAlbum.get(row.entityId) ?? { total: 0, by: {} };
    entry.total += row._count._all;
    entry.by[row.label] = (entry.by[row.label] ?? 0) + row._count._all;
    byAlbum.set(row.entityId, entry);
    byPlatform[row.label] = (byPlatform[row.label] ?? 0) + row._count._all;
  }

  const total = [...byAlbum.values()].reduce((n, e) => n + e.total, 0);
  const topAlbum = albums
    .map((a) => ({ a, n: byAlbum.get(a.id)?.total ?? 0 }))
    .sort((x, y) => y.n - x.n)[0];
  const topApp = Object.entries(byPlatform).sort((x, y) => y[1] - x[1])[0];
  const max = Math.max(1, ...albums.map((a) => byAlbum.get(a.id)?.total ?? 0));

  return (
    <AdminShell
      role={user.role}
      email={user.email}
      title="Albums"
      subtitle="The trending chart and where readers go to listen"
      actions={<Link href="/admin/albums/new" className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">+ New album</Link>}
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Listen clicks · 30 days", value: total.toLocaleString() },
          { label: "Most clicked album", value: total && topAlbum?.n ? topAlbum.a.title : "—" },
          { label: "Top music app", value: topApp ? platformLabel(topApp[0]) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <div className="text-[12.5px] text-(--sub-text)">{s.label}</div>
            <div className="mt-2 truncate text-2xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      {user.role === "ADMIN" ? (
        <AlbumStyleForm
          templates={THEME_KEYS.map((key) => ({ key, name: THEME_META[key].name }))}
          styles={albumStyles}
          active={activeTheme}
        />
      ) : null}

      {albums.length === 0 ? (
        <EmptyState
          title="No albums on the chart yet"
          body="Add the first album and it appears in the Trending Albums section on the homepage once published."
          action={{ href: "/admin/albums/new", label: "New album" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-(--border-strong) bg-(--card-bg)">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-(--sub-text)">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Album</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {PLATFORMS.map((p) => <th key={p.key} className="px-3 py-3 text-right font-medium">{p.label}</th>)}
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3"><span className="sr-only">Share of clicks</span></th>
              </tr>
            </thead>
            <tbody>
              {albums.map((a) => {
                const c = byAlbum.get(a.id) ?? { total: 0, by: {} };
                return (
                  <tr key={a.id} className="border-t border-(--border-strong)">
                    <td className="px-4 py-3 text-xs text-(--sub-text)">{a.published ? a.rank : "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/albums/${a.id}`} className="font-bold hover:text-(--primary)">{a.title}</Link>
                      <div className="text-xs text-(--sub-text)">{a.artistName}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={a.published ? "PUBLISHED" : "DRAFT"} /></td>
                    {PLATFORMS.map((p) => (
                      <td key={p.key} className="px-3 py-3 text-right tabular-nums">{c.by[p.key] ?? 0}</td>
                    ))}
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{c.total}</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 min-w-20 rounded-full bg-(--surface-alt)">
                        <i className="block h-full rounded-full bg-(--primary)" style={{ width: `${(c.total / max) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-(--sub-text)">
        Each &ldquo;Listen on…&rdquo; click passes through the site before opening the app, so it is counted here. Bots are left out.
      </p>
    </AdminShell>
  );
}
