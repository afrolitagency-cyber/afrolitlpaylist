import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { SubscriberManager } from "@/components/admin/SubscriberManager";

export const dynamic = "force-dynamic";

export default async function NewsletterListPage() {
  const user = await requireRole(...can.sendCampaigns);
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <AdminShell role={user.role} email={user.email} title="Subscriber list"
      subtitle="Add, tag and import people who can receive campaigns"
      actions={<Link href="/admin/newsletter" className="rounded border border-(--border-strong) px-4 py-2 text-sm font-bold">Campaigns</Link>}>
      <SubscriberManager subscribers={subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        firstName: s.firstName ?? "",
        status: s.status,
        tags: s.tags,
        wantsBlog: s.wantsBlog,
        wantsEvents: s.wantsEvents,
      }))} />
    </AdminShell>
  );
}
