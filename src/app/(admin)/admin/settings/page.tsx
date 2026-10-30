import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { ThemePicker, IdentityForm, EmbedForm, ListenForm } from "@/components/admin/SettingsForms";
import { getActiveTheme, getIdentity, getEmbedSetting } from "@/lib/settings";
import { getListenSetting } from "@/lib/widgets";
import { OLD_SIDEBAR_LINKS } from "@/lib/oldSidebarLinks";
import { THEME_KEYS, THEME_META } from "@/components/themes/registry";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireRole(...can.manageSettings);
  const [active, identity, embed, listen] = await Promise.all([
    getActiveTheme(),
    getIdentity(),
    getEmbedSetting(),
    getListenSetting(),
  ]);

  const themes = THEME_KEYS.map((k) => ({ key: k, ...THEME_META[k] }));

  return (
    <AdminShell role={user.role} email={user.email} title="Settings" subtitle="Theme, identity, Listen on and the sidebar players">
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
          <h2 className="mb-4 text-[15px] font-bold">Listen on</h2>
          <ListenForm values={listen} />
        </section>

        <section className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h2 className="mb-4 text-[15px] font-bold">Sidebar players</h2>
          <EmbedForm values={embed} />
        </section>

        <section className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h2 className="mb-2 text-[15px] font-bold">Saved links from the old sidebar</h2>
          <p className="mb-4 text-sm text-(--sub-text)">
            These are not live. Copy one into Listen on or Sidebar players when you want it on the site. The first player stays on top, and each one you add stacks under it.
          </p>
          <ul className="space-y-3">
            {OLD_SIDEBAR_LINKS.map((item) => (
              <li key={item.url} className="rounded-lg border border-(--border-strong) p-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-(--sub-text)">{item.group}</span>
                <b className="mt-1 block text-sm">{item.title}</b>
                <a href={item.url} className="mt-1 block truncate text-sm text-(--primary)" target="_blank" rel="noreferrer">{item.url}</a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
