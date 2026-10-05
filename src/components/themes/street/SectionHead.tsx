import Link from "next/link";
import type { Route } from "next";
import type { SectionHeadProps } from "../types";

/** Uppercase heavy heading with a trailing rule — the Street signature. */
export default function SectionHead({ title, href, cta = "View all" }: SectionHeadProps) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-3 first:mt-0">
      <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
      <span className="h-px flex-1 bg-(--border-strong)" />
      {href ? <Link href={href as Route} className="whitespace-nowrap text-xs font-bold uppercase text-(--primary)">{cta}</Link> : null}
    </div>
  );
}
