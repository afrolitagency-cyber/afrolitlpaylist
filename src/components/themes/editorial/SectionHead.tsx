import Link from "next/link";
import type { SectionHeadProps } from "../types";

export default function SectionHead({ title, href, cta = "View all" }: SectionHeadProps) {
  return (
    <div className="mb-5 flex items-baseline gap-4">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <span className="h-px flex-1 bg-(--border-strong)" />
      {href ? <Link href={href} className="whitespace-nowrap text-sm font-bold hover:text-(--primary)">{cta}</Link> : null}
    </div>
  );
}
