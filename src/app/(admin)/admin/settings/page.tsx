import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { ThemePicker, IdentityForm, EmbedForm } from "@/components/admin/SettingsForms";
import { getActiveTheme, getIdentity, getEmbedSetting } from "@/lib/settings";
import { THEME_KEYS, THEME_META } from "@/components/themes/registry";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireRole(...can.manageSettings);
  const [active, identity, embed] = await Promise.all([getActiveTheme(), getIdentity(), getEmbedSetting()]);

  const themes = THEME_KEYS.map((k) => ({ key: k, ...THEME_META[k] }));

  return (
    <AdminShell role={user.role} email={user.email} title="Settings" subtitle="Theme, identity and the sidebar player">
      <div className="space-y-5">
        <section className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h2 className="mb-4 text-[15px] font-bold">Active template</h2>
          <ThemePicker themes={themes} active={active} />
        </section>

        <section className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h2 className="mb-4 text-[15px] font-bold">Site identity</h2>
          <IdentityForm
            values={{
              name: identity.name,
              tagline: identity.tagline,
              instagram: identity.socials.instagram ?? "",
              x: identity.socials.x ?? "",
              youtube: identity.socials.youtube ?? "",
              tiktok: identity.socials.tiktok ?? "",
            }}
          />
        </section>

        <section className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h2 className="mb-4 text-[15px] font-bold">Sidebar players</h2>
          <EmbedForm values={embed} />
        </section>
      </div>
    </AdminShell>
  );
}
