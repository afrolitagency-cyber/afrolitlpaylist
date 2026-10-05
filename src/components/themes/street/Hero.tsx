import Link from "next/link";
import Image from "next/image";
import type { HeroProps, Story } from "../types";

function Feature({ story, lead = false }: { story: Story; lead?: boolean }) {
  return (
    <Link href={`/blog/${story.slug}`} className="relative block overflow-hidden rounded-md">
      <div className={`relative bg-(--surface) ${lead ? "h-[340px]" : "h-[260px]"}`}>
        {story.coverImage ? <Image src={story.coverImage} alt="" fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover" priority={lead} /> : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 to-transparent p-5">
        <span className="inline-block rounded-sm bg-(--primary) px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
          {story.category ?? "Feature"}
        </span>
        <h3 className={`mt-2 font-extrabold leading-snug text-white ${lead ? "text-xl" : "text-[15px]"}`}>{story.title}</h3>
      </div>
    </Link>
  );
}

/** Dense 2fr/1fr/1fr feature grid with eyebrow tags. */
export default function Hero({ lead, secondary }: HeroProps) {
  if (!lead) return null;
  return (
    <section className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
      <div className="sm:col-span-2 lg:col-span-1"><Feature story={lead} lead /></div>
      {secondary.slice(0, 2).map((s) => <Feature key={s.slug} story={s} />)}
    </section>
  );
}
