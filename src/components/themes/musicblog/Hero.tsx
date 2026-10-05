import ArticleCard from "../editorial/ArticleCard";
import type { HeroProps } from "../types";

/** Feature strip: a tall lead card beside a 2×2 of smaller stories. On tablet
 *  the tall card leads the row so no card is stranded alone. */
export default function Hero({ lead, secondary }: HeroProps) {
  if (!lead) return null;
  return (
    <section className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3">
      <div className="order-first sm:col-span-2 lg:order-none lg:col-span-1 lg:row-span-2">
        <ArticleCard story={lead} size="lg" />
      </div>
      {secondary.slice(0, 4).map((s) => <ArticleCard key={s.slug} story={s} />)}
    </section>
  );
}
