import Link from "next/link";
import type { Route } from "next";

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
    return `${basePath}${s ? `?${s}` : ""}` as Route;
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

/** Pages to show: the ends, the current page, and its neighbours. Gaps become an ellipsis. */
function pageWindow(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const keep = new Set<number>([1, pages, page - 1, page, page + 1]);
  if (page <= 3) {
    keep.add(2);
    keep.add(3);
  }
  if (page >= pages - 2) {
    keep.add(pages - 1);
    keep.add(pages - 2);
  }

  const nums = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const prev = nums[i - 1];
    if (n !== undefined && prev !== undefined && n - prev > 1) out.push("gap");
    if (n !== undefined) out.push(n);
  }
  return out;
}

/** Desktop shows a short number row. A phone shows “Page 3 of 25” with previous and next. */
export function CompactPagination({
  page,
  pages,
  total,
  perPage,
  basePath,
  params = {},
  noun = "stories",
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  noun?: string;
}) {
  if (pages <= 1 || total <= 0) return null;

  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return `${basePath}${s ? `?${s}` : ""}` as Route;
  };

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const items = pageWindow(page, pages);
  const btn = "grid size-9 place-items-center rounded-full text-sm font-bold";
  const idle = "text-(--body-text) hover:bg-(--surface-alt)";
  const arrow = (n: number | null, label: string, rel?: "prev" | "next") =>
    n ? (
      <Link href={href(n)} rel={rel} aria-label={label} className={`${btn} ${idle}`}>
        {rel === "prev" ? "‹" : "›"}
      </Link>
    ) : (
      <span aria-hidden className={`${btn} text-(--sub-text) opacity-40`}>{rel === "prev" ? "‹" : "›"}</span>
    );

  return (
    <nav aria-label="Pagination" className="mt-9">
      <div className="flex items-center justify-between rounded-2xl border border-(--border-strong) px-2 py-1.5 sm:hidden">
        {arrow(page > 1 ? page - 1 : null, "Previous page", "prev")}
        <span className="text-sm font-semibold">Page {page} of {pages}</span>
        {arrow(page < pages ? page + 1 : null, "Next page", "next")}
      </div>

      <div className="hidden items-center justify-between gap-4 sm:flex">
        <p className="text-sm text-(--sub-text)">
          Showing {start}–{end} of {total} {noun}
        </p>
        <div className="flex items-center gap-1 rounded-2xl border border-(--border-strong) px-1.5 py-1">
          {arrow(page > 1 ? page - 1 : null, "Previous page", "prev")}
          {items.map((item, i) =>
            item === "gap" ? (
              <span key={`gap-${i}`} className="grid size-9 place-items-center text-sm text-(--sub-text)">…</span>
            ) : (
              <Link
                key={item}
                href={href(item)}
                aria-current={item === page ? "page" : undefined}
                className={`${btn} ${item === page ? "bg-(--primary) text-white" : idle}`}
              >
                {item}
              </Link>
            ),
          )}
          {arrow(page < pages ? page + 1 : null, "Next page", "next")}
        </div>
      </div>
    </nav>
  );
}
