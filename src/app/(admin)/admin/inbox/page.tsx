import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { InboxView, type Message } from "@/components/admin/InboxView";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireRole(...can.moderate);

  const rows = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  const messages: Message[] = rows.map((m: {
    id: string; name: string; email: string; subject: string | null; body: string;
    kind: string | null; status: string; createdAt: Date;
  }) => ({
    id: m.id, name: m.name, email: m.email, subject: m.subject ?? "", body: m.body,
    kind: m.kind ?? "general", status: m.status, createdAt: m.createdAt.toLocaleDateString("en-GB"),
  }));

  const unread = messages.filter((m) => m.status === "NEW").length;

  return (
    <AdminShell role={user.role} email={user.email} title="Contact inbox"
      subtitle={`${unread} unread · ${messages.length} total`}>
      <InboxView messages={messages} />
    </AdminShell>
  );
}
