/** AfroLit Playlist mark — black disc, Africa silhouette, red vinyl drop. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="AfroLit Playlist" className="shrink-0">
      <circle cx="50" cy="50" r="49" fill="#000" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#2a2a2a" />
      <path fill="#fff" d="M52 14c6 1 11 5 13 10 3 6 2 12-1 17 4 2 7 6 8 11 2 8-1 17-7 23-4 4-9 7-14 8l-3-9c4-1 8-3 11-6 4-4 6-10 5-16-1-5-4-9-9-11l-2 12-5-1 2-13c-4 0-8 2-10 5-3 4-4 9-2 14l2 5-8 4-3-7c-3-7-2-15 3-21 4-5 10-8 16-8l1-9c-5 0-10 2-13 6-4 4-6 10-5 16l-9 2c-2-8 0-16 5-22 5-6 12-9 20-9z" />
      <path fill="#E50914" d="M46 40c5-6 13-6 18-1 5 5 5 13-1 19l-8 8-8-8c-6-6-6-13-1-18z" />
      <text x="50" y="82" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="12" fill="#E50914" letterSpacing="0.3">AFROLIT</text>
      <text x="50" y="93" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="9" fill="#fff" letterSpacing="1">PLAYLIST</text>
    </svg>
  );
}

/** The brand is "AfroLit Playlist" — `full` keeps the second word. */
export function Wordmark({ full = true, className = "" }: { full?: boolean; className?: string }) {
  return (
    <span className={`whitespace-nowrap font-black tracking-tight ${className}`}>
      AFRO<em className="not-italic text-(--primary)">LIT</em>
      {full ? <span className="font-normal">PLAYLIST</span> : null}
    </span>
  );
}

export function Brand({ full = true, size = 40 }: { full?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <Wordmark full={full} />
    </span>
  );
}
