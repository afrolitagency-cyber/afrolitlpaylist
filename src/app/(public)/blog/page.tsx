import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveTheme } from "@/lib/settings";
import { loadTheme } from "@/components/themes/registry";
import type { Story } from "@/components/themes/types";
import { AdSlot } from "@/components/ads/AdSlot";
import { WidgetSidebar } from "@/components/widgets/Sidebar";
import { WidgetSkeleton } from "@/components/ui/Skeleton";
import { CompactPagination } from "@/components/ui/Pagination";

export const revalidate = 300;
export const metadata = { title: "Blog" };

const PER_PAGE = 12;

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page } = await searchParams;
  const current = Math.max(1, Number(page ?? 1) || 1);

  const where = {
    status: "PUBLISHED" as const,
    ...(category ? { category: { slug: category } } : {}),
  };

  const [themeKey, posts, total, categories] = await Promise.all([
    getActiveTheme(),
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (current - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const { ArticleCard, SectionHead } = await loadTheme(themeKey);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const stories: Story[] = posts.map((p: {
    slug: string; title: string; excerpt: string | null; coverImage: string | null;
    publishedAt: Date | null; category: { name: string } | null;
  }) => ({ ...p, category: p.category?.name ?? null }));

  return (
    <div className="wrap py-8">
      <h1 className="mb-2 text-[clamp(28px,4vw,44px)] font-black">Blog</h1>
      <p className="mb-6 text-(--sub-text)">News, interviews and everything moving in Afro music.</p>

      <div className="mb-7 flex flex-wrap gap-2">
        <Link href="/blog" className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${!category ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text)"}`}>
          All
        </Link>
        {categories.map((c: { slug: string; name: string }) => (
          <Link key={c.slug} href={`/blog?category=${c.slug}`}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${category === c.slug ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text) hover:text-(--body-text)"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      <AdSlot placement="TOP_LEADERBOARD" path="/blog" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main>
          <SectionHead title={category ? `${category} stories` : "Latest stories"} />
          {stories.length === 0 ? (
            <p className="text-(--sub-text)">Nothing published here yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {stories.map((s) => <ArticleCard key={s.slug} story={s} />)}
            </div>
          )}

          <AdSlot placement="IN_FEED_NATIVE" path="/blog" />

          <CompactPagination
            page={current}
            pages={pages}
            total={total}
            perPage={PER_PAGE}
            basePath="/blog"
            params={{ category }}
          />
        </main>
        <Suspense fallback={<div className="flex flex-col gap-5"><WidgetSkeleton /><WidgetSkeleton /><WidgetSkeleton /></div>}>
          <WidgetSidebar path="/blog" />
        </Suspense>
      </div>

      <AdSlot placement="BOTTOM_LEADERBOARD" path="/blog" />
    </div>
  );
}
