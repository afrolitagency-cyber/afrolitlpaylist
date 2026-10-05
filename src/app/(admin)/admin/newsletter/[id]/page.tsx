import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { CampaignComposer, type CampaignValues } from "@/components/admin/CampaignComposer";

export const dynamic = "force-dynamic";

function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK: CampaignValues = {
  subject: "", previewText: "", fromName: "", fromEmail: "", body: "",
  audienceTag: "", scheduledAt: "", status: "DRAFT",
};

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.sendCampaigns);
  const isNew = id === "new";

  const [campaign, recipients] = await Promise.all([
    isNew ? null : prisma.campaign.findUnique({ where: { id } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
  ]);
  if (!isNew && !campaign) notFound();

  const values: CampaignValues = campaign
    ? {
        id: campaign.id,
        subject: campaign.subject,
        previewText: campaign.previewText ?? "",
        fromName: campaign.fromName ?? "",
        fromEmail: campaign.fromEmail ?? "",
        body: typeof campaign.body === "string" ? campaign.body : "",
        audienceTag: campaign.audienceTag ?? "",
        scheduledAt: forInput(campaign.scheduledAt),
        status: campaign.status,
      }
    : BLANK;

  return (
    <AdminShell role={user.role} email={user.email} title={isNew ? "New campaign" : "Edit campaign"}
      subtitle={campaign?.subject ?? "Draft"}>
      <CampaignComposer values={values} recipients={recipients} />
    </AdminShell>
  );
}
