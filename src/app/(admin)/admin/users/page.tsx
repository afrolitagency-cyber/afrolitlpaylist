import { prisma } from "@/lib/prisma";
import { assignableRoles, requireRoleFresh, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { UsersTable, type UserRow } from "@/components/admin/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireRoleFresh(...can.manageUsers);
  const [rows, mine] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }], take: 200 }),
    prisma.user.findUnique({ where: { id: me.id }, select: { artistAccess: true } }),
  ]);

  const users: UserRow[] = rows.map((u) => ({
    id: u.id, email: u.email, name: u.name ?? "", role: u.role, status: u.status,
    lastActive: u.lastActiveAt ? u.lastActiveAt.toLocaleDateString("en-GB") : "—",
    isSelf: u.id === me.id,
    artistAccess: u.artistAccess,
  }));
  const canInviteArtists = me.role === "SUPERADMIN" || Boolean(mine?.artistAccess);

  return (
    <AdminShell role={me.role} email={me.email} title="Users" subtitle="Accounts, roles and access">
      <UsersTable
        users={users}
        actorRole={me.role}
        assignable={assignableRoles(me.role)}
        canInviteArtists={canInviteArtists}
      />
      <div className="mt-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 text-sm text-(--sub-text)">
        <b className="mb-2 block text-(--body-text)">What each role can do</b>
        <p>Superadmin: the full dashboard, including artists, and can assign every role. Superadmin authorizes which admins may add artists.</p>
        <p>Admins: posts, events, newsletter, ads, and users. They assign editor, door, and artist. Creating, inviting, or registering an artist stays closed until a superadmin allows it.</p>
        <p>Editors: content and moderation, without settings, users, campaigns, or artist profiles.</p>
        <p>Artists: their own profile (reviewed) and discography (publishes immediately).</p>
      </div>
    </AdminShell>
  );
}
