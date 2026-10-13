import Image from "next/image";

/** Mirrors a story card enough to sit in the feed, but is not ArticleCard:
 *  the link is sponsored and clicks go through the counting route. */
export function NativeAd({
  creative,
}: {
  creative: {
    id: string;
    headline: string | null;
    body: string | null;
    thumbUrl: string | null;
    ctaLabel: string | null;
    advertiser: string | null;
    clickUrl: string | null;
  };
}) {
  if (!creative.headline) return null;

  return (
    <a
      href={`/api/ads/click?id=${creative.id}`}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      className="flex gap-4 rounded-xl bg-(--card-bg) p-4 transition-colors hover:bg-(--surface-alt)"
    >
      {creative.thumbUrl ? (
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-(--surface)">
          <Image src={creative.thumbUrl} alt="" fill sizes="80px" className="object-cover" />
        </div>
      ) : null}

      <div className="min-w-0">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-(--sub-text)">
          Sponsored{creative.advertiser ? ` · ${creative.advertiser}` : ""}
        </span>
        <h3 className="truncate text-[15px] font-bold">{creative.headline}</h3>
        {creative.body ? (
          <p className="mt-1 line-clamp-2 text-[13px] text-(--sub-text)">{creative.body}</p>
        ) : null}
        <span className="mt-1.5 inline-block text-[12px] font-semibold text-(--primary)">
          {creative.ctaLabel ?? "Learn more"} →
        </span>
      </div>
    </a>
  );
}
