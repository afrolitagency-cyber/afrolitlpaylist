import Link from "next/link";
import type { Route } from "next";

/**
 * Shown when a query legitimately returns nothing. Deliberately distinct from a
 * skeleton: a reader should never be left guessing whether data is loading or
 * simply absent.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-(--border-strong) p-8 text-center">
      <p className="font-bold">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-sm text-sm text-(--sub-text)">{body}</p> : null}
      {action ? (
        <Link href={action.href as Route} className="mt-4 inline-block rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
