import Link from "next/link";
import Image from "next/image";
import type { ArticleCardProps } from "../types";

/** Bordered variant — the Darkroom grid reads as framed cards. */
export default function ArticleCard({ story, size = "md" }: ArticleCardProps) {
  return (
    <Link href={`/blog/${story.slug}`}
      className="block overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg) transition-colors hover:border-(--primary)">
      <div className={`relative bg-(--surface) ${size === "lg" ? "h-[320px]" : "h-[150px]"}`}>
        {story.coverImage ? <Image src={story.coverImage} alt="" fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover" /> : null}
      </div>
      <div className="p-4">
        {story.category ? <span className="text-xs font-bold uppercase text-(--primary)">{story.category}</span> : null}
        <h3 className="mt-1.5 text-[15px] font-bold leading-snug">{story.title}</h3>
        {story.publishedAt ? (
          <p className="mt-1.5 text-xs text-(--sub-text)">{story.publishedAt.toLocaleDateString("en-GB")}</p>
        ) : null}
      </div>
    </Link>
  );
}
