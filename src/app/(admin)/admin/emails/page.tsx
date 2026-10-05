import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { EmailTemplates, type TemplateRow } from "@/components/admin/EmailTemplates";
import { TEMPLATE_DEFAULTS, type TemplateKey } from "@/lib/services/email";

export const dynamic = "force-dynamic";

const PLACEHOLDERS: Record<TemplateKey, string[]> = {
  "event.registration": ["name", "event", "date", "venue"],
  "artist.invite": ["artist"],
  "artist.changes": ["artist", "note"],
  "artist.approved": ["artist"],
  "newsletter.confirm": [],
};

export default async function EmailTemplatesPage() {
  const user = await requireRole(...can.manageSettings);
  const saved = await prisma.emailTemplate.findMany();
  const byKey = new Map(saved.map((t: { key: string; subject: string; body: string }) => [t.key, t]));

  const templates: TemplateRow[] = (Object.keys(TEMPLATE_DEFAULTS) as TemplateKey[]).map((key) => {
    const custom = byKey.get(key) as { subject: string; body: string } | undefined;
    const base = TEMPLATE_DEFAULTS[key];
    return {
      key,
      name: base.name,
      subject: custom?.subject ?? base.subject,
      body: custom?.body ?? base.body,
      customised: Boolean(custom),
      placeholders: PLACEHOLDERS[key],
    };
  });

  return (
    <AdminShell role={user.role} email={user.email} title="Email templates"
      subtitle="Subject and copy for transactional emails">
      <EmailTemplates templates={templates} />
    </AdminShell>
  );
}
