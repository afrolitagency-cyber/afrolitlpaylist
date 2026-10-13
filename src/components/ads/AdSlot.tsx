import type { AdPlacement } from "@prisma/client";
import { AD_SIZES, resolveSlot } from "@/lib/ads";
import { AdImpression } from "./AdImpression";
import { NativeAd } from "./NativeAd";
import { NetworkUnit } from "./NetworkUnit";

function AdImage({
  creative,
}: {
  creative: {
    imageUrl: string | null;
    imageUrlMobile: string | null;
    altText: string | null;
    advertiser: string | null;
  };
}) {
  const alt = creative.altText ?? `Advertisement${creative.advertiser ? ` — ${creative.advertiser}` : ""}`;
  if (!creative.imageUrl && !creative.imageUrlMobile) return null;
  return (
    <picture>
      {creative.imageUrlMobile ? (
        <source media="(max-width: 640px)" srcSet={creative.imageUrlMobile} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={creative.imageUrl ?? creative.imageUrlMobile!}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    </picture>
  );
}

/** Renders nothing when the slot is off or unsold — no reserved gap. */
export async function AdSlot({ placement, path }: { placement: AdPlacement; path: string }) {
  const resolved = await resolveSlot(placement, path);
  if (!resolved) return null;

  const size = AD_SIZES[placement];
  const { kind, slot, creative } = resolved;
  const native = placement === "IN_FEED_NATIVE";
  const bottom = placement === "BOTTOM_LEADERBOARD";
  const sidebar = placement === "SIDEBAR_RECTANGLE";

  const box = creative?.kind === "HTML" && creative.html ? (
    <iframe
      title="Advertisement"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      srcDoc={creative.html}
      width={size?.w}
      height={size?.h}
      className="w-full border-0"
    />
  ) : kind === "network" && slot.networkCode ? (
    <NetworkUnit unit={slot.networkCode} w={size?.w} h={size?.h} />
  ) : creative?.clickUrl ? (
    <a
      href={`/api/ads/click?id=${creative.id}`}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      className="block h-full w-full"
    >
      <AdImage creative={creative} />
    </a>
  ) : creative ? (
    <AdImage creative={creative} />
  ) : null;

  const mark = creative ? <AdImpression id={creative.id} trackerUrl={creative.trackerUrl} /> : null;

  if (native) {
    if (!creative?.headline) return null;
    return (
      <div className="relative my-2">
        <NativeAd creative={creative} />
        {mark}
      </div>
    );
  }

  return (
    <aside
      className={`flex flex-col items-center ${sidebar ? "mb-5" : "my-6"}`}
      aria-label="Advertisement"
    >
      <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-(--sub-text)">
        {size?.label ?? "Advertisement"}
      </span>
      <div
        className={`relative w-full overflow-hidden ${
          sidebar
            ? "mx-auto max-w-[300px] aspect-[300/250]"
            : bottom
              ? "max-w-[970px] aspect-[970/250] max-md:aspect-[320/100]"
              : "max-w-[970px] aspect-[970/90] max-md:aspect-[320/100]"
        }`}
      >
        {box}
        {mark}
      </div>
    </aside>
  );
}
