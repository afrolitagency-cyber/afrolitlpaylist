import ArticleCard from "./ArticleCard";
import type { HeroProps } from "../types";

export default function Hero({ lead, secondary }: HeroProps) {
  if (!lead) return null;
  return (
    <section className="grid gap-6 py-8 lg:grid-cols-[1.6fr_1fr]">
      <ArticleCard story={lead} size="lg" />
      <div className="flex flex-col gap-4">
        {secondary.slice(0, 3).map((s) => <ArticleCard key={s.slug} story={s} size="sm" />)}
      </div>
    </section>
  );
}
