import Link from "next/link";
import Image from "next/image";
import type { HeroProps } from "../types";

/** Full-bleed poster. Nothing sits above it by design — the cinematic opening
 *  is the point of this template. */
export default function Hero({ lead }: HeroProps) {
  if (!lead) return null;
  return (
    <section className="relative my-7 overflow-hidden rounded-xl">
      <div className="relative h-[clamp(320px,45vw,440px)] bg-(--surface)">
        {lead.coverImage ? <Image src={lead.coverImage} alt="" fill sizes="100vw" className="object-cover" priority /> : null}
      </div>
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 sm:p-10">
        <div>
          {lead.category ? (
            <span className="text-xs font-bold uppercase tracking-wide text-(--primary)">{lead.category}</span>
          ) : null}
          <h2 className="mb-4 mt-2.5 max-w-[760px] text-[clamp(26px,4.4vw,56px)] font-black leading-[1.1] text-white">
            {lead.title}
          </h2>
          <Link href={`/blog/${lead.slug}`} className="inline-block rounded bg-(--primary) px-6 py-3 text-sm font-semibold text-white">
            Read the story
          </Link>
        </div>
      </div>
    </section>
  );
}
