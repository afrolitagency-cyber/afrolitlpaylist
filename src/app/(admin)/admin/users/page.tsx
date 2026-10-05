import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { UsersTable, type UserRow } from "@/components/admin/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireRole(...can.manageUsers);
  const rows = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }], take: 200 });

  const users: UserRow[] = rows.map((u: {
    id: string; email: string; name: string | null; role: string; status: string; lastActiveAt: Date | null;
  }) => ({
    id: u.id, email: u.email, name: u.name ?? "", role: u.role, status: u.status,
    lastActive: u.lastActiveAt ? u.lastActiveAt.toLocaleDateString("en-GB") : "—",
    isSelf: u.id === me.id,
  }));

  return (
    <AdminShell role={me.role} email={me.email} title="Users" subtitle="Accounts, roles and access">
      <UsersTable users={users} />
      <div className="mt-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 text-sm text-(--sub-text)">
        <b className="mb-2 block text-(--body-text)">What each role can do</b>
        <p>Admins: everything, including settings, users, artist approval and newsletter sends.</p>
        <p>Editors: all content and moderation, but not settings, users, approvals or campaigns.</p>
        <p>Artists: their own profile (reviewed) and discography (publishes immediately).</p>
      </div>
    </AdminShell>
  );
}
