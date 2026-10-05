import Link from "next/link";
import Image from "next/image";
import type { ArticleCardProps } from "../types";

export default function ArticleCard({ story, size = "md" }: ArticleCardProps) {
  const horizontal = size === "sm";
  return (
    <Link
      href={`/blog/${story.slug}`}
      className={`block overflow-hidden rounded-xl bg-(--card-bg) transition-transform hover:-translate-y-0.5 ${horizontal ? "flex items-center gap-3 p-2.5" : ""}`}
    >
      <div className={`relative overflow-hidden bg-(--surface) ${horizontal ? "h-[84px] w-[110px] shrink-0 rounded-lg" : size === "lg" ? "h-[380px]" : "h-[170px]"}`}>
        {story.coverImage ? <Image src={story.coverImage} alt="" fill sizes="(max-width:1024px) 100vw, 60vw" className="object-cover" /> : null}
      </div>
      <div className={horizontal ? "min-w-0" : "p-4"}>
        {story.category ? <span className="text-xs font-bold uppercase tracking-wide text-(--primary)">{story.category}</span> : null}
        <h3 className={`mt-1.5 font-bold leading-snug ${size === "lg" ? "text-[clamp(22px,2.6vw,30px)]" : horizontal ? "text-[15px]" : "text-[17px]"}`}>{story.title}</h3>
        {story.publishedAt && !horizontal ? (
          <p className="mt-1.5 text-xs text-(--sub-text)">
            {story.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
