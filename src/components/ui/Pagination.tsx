import Link from "next/link";

/** Window of page links around the current page — a thousand-post blog must not
 *  render a thousand numbers. */
export function Pagination({ page, pages, basePath, params = {} }: {
  page: number; pages: number; basePath: string; params?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };

  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const window = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <nav aria-label="Pagination" className="mt-9 flex flex-wrap justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev"
          className="grid h-10 min-w-10 place-items-center rounded border border-(--border-strong) px-3 font-bold">‹</Link>
      ) : null}

      {from > 1 ? <span className="grid h-10 place-items-center px-1 text-(--sub-text)">…</span> : null}

      {window.map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined}
          className={`grid h-10 min-w-10 place-items-center rounded border px-3 font-bold ${
            n === page ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong)"
          }`}>
          {n}
        </Link>
      ))}

      {to < pages ? <span className="grid h-10 place-items-center px-1 text-(--sub-text)">…</span> : null}

      {page < pages ? (
        <Link href={href(page + 1)} rel="next"
          className="grid h-10 min-w-10 place-items-center rounded border border-(--border-strong) px-3 font-bold">›</Link>
      ) : null}
    </nav>
  );
}
