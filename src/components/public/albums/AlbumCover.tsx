import Image from "next/image";

const FALLBACKS = [
  "radial-gradient(circle at 72% 28%,var(--primary) 0 17%,transparent 18%),linear-gradient(160deg,#2a0b10,#0a0a0c 65%)",
  "repeating-linear-gradient(135deg,var(--primary) 0 9px,#0a0a0c 9px 20px)",
  "radial-gradient(circle,#0a0a0c 0 12%,transparent 13%),repeating-radial-gradient(circle,var(--primary) 0 6px,#0a0a0c 6px 13px,#f6f5f2 13px 15px,#0a0a0c 15px 22px)",
  "radial-gradient(circle at 50% 58%,#0a0a0c 0 22%,transparent 23%),linear-gradient(90deg,#f6f5f2 0 50%,var(--primary) 50%)",
];

function pick(title: string) {
  let sum = 0;
  for (const ch of title) sum += ch.charCodeAt(0);
  return FALLBACKS[sum % FALLBACKS.length];
}

/** Square cover. Albums without art get a generated pattern instead of a blank box. */
export function AlbumCover({
  title,
  src,
  sizes,
  label = true,
  priority = false,
}: {
  title: string;
  src: string | null;
  sizes: string;
  label?: boolean;
  priority?: boolean;
}) {
  if (src) {
    return <Image src={src} alt={`${title} cover`} fill sizes={sizes} priority={priority} className="object-cover" />;
  }
  return (
    <span className="absolute inset-0 block" style={{ background: pick(title) }} aria-hidden>
      {label ? (
        <>
          <span className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-black/55" />
          <b className="absolute bottom-2 left-2.5 max-w-[85%] text-[clamp(10px,1.2vw,14px)] font-bold leading-tight text-white">
            {title}
          </b>
        </>
      ) : null}
    </span>
  );
}

export function Movement({ value }: { value: number }) {
  if (value > 0) return <span className="text-[11px] font-semibold text-(--primary)" aria-label={`Up ${value}`}>▲ {value}</span>;
  if (value < 0) return <span className="text-[11px] font-semibold text-(--sub-text)" aria-label={`Down ${-value}`}>▼ {-value}</span>;
  return <span className="text-[11px] font-semibold text-(--sub-text)" aria-label="No change">–</span>;
}
