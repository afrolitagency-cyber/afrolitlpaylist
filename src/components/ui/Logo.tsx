export const LOGO_SRC = "/brand/afrolit-logo.png";

/** The shared PNG, in a round frame. Site type sits beside it. */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={LOGO_SRC}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/** The brand is "AfroLit Playlist" — `full` keeps the second word. */
export function Wordmark({ full = true, className = "" }: { full?: boolean; className?: string }) {
  return (
    <span className={`whitespace-nowrap font-black tracking-tight ${className}`}>
      AFRO<em className="not-italic text-(--primary)">LIT</em>
      {full ? "PLAYLIST" : null}
    </span>
  );
}

export function Brand({
  full = true,
  size = 40,
  tagline,
}: {
  full?: boolean;
  size?: number;
  tagline?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex min-w-0 flex-col">
        <Wordmark full={full} />
        {tagline ? (
          <span className="mt-0.5 text-[10px] font-normal tracking-normal text-white/80 sm:text-xs">{tagline}</span>
        ) : null}
      </span>
    </span>
  );
}
