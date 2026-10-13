import { requireRoleFresh } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { AdSlotForm } from "@/components/admin/AdSlotForm";
import { AdCreativeForm } from "@/components/admin/AdCreativeForm";
import { AdsVisibilityForm } from "@/components/admin/AdsVisibilityForm";
import { AD_PLACEMENTS, AD_PLACEMENT_COPY, adsArePublic, getAdminAdSlots, type AdSlotWithCreatives } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function AdminAds() {
  const user = await requireRoleFresh("ADMIN");
  const [slots, visible] = await Promise.all([getAdminAdSlots(), adsArePublic()]);
  const byPlacement = new Map<AdSlotWithCreatives["placement"], AdSlotWithCreatives>(
    slots.map((s) => [s.placement, s]),
  );

  return (
    <AdminShell role={user.role} email={user.email} title="Ads" subtitle="Direct-sold creatives. Empty slots stay invisible. Closeout numbers come from the sold creative — never add a house ad into a brand report.">
      <div className="space-y-8">
        <AdsVisibilityForm visible={visible} />
        {AD_PLACEMENTS.map((placement) => {
          const slot = byPlacement.get(placement);
          const copy = AD_PLACEMENT_COPY[placement];
          if (!slot || !copy) return null;
          return (
            <section key={placement} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
              <h2 className="text-[17px] font-bold">{copy.name}</h2>
              <p className="mb-4 text-xs text-(--sub-text)">{copy.size}</p>
              <AdSlotForm
                placement={slot.placement}
                enabled={slot.enabled}
                fillMode={slot.fillMode}
                networkCode={slot.networkCode}
                disabledOn={slot.disabledOn}
              />
              <div className="space-y-4">
                {slot.creatives.map((c) => (
                  <AdCreativeForm key={c.id} slotId={slot.id} placement={placement} sizeHint={copy.size} creative={c} />
                ))}
                <AdCreativeForm slotId={slot.id} placement={placement} sizeHint={copy.size} />
              </div>
            </section>
          );
        })}
      </div>
    </AdminShell>
  );
}
