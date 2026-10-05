import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveTheme } from "@/lib/settings";
import { loadTheme } from "@/components/themes/registry";
import type { Story } from "@/components/themes/types";

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

      <SectionHead title={category ? `${category} stories` : "Latest stories"} />
      {stories.length === 0 ? (
        <p className="text-(--sub-text)">Nothing published here yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => <ArticleCard key={s.slug} story={s} />)}
        </div>
      )}

      {pages > 1 ? (
        <nav className="mt-9 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/blog?${category ? `category=${category}&` : ""}page=${n}`}
              aria-current={n === current ? "page" : undefined}
              className={`grid h-10 min-w-10 place-items-center rounded border px-3 font-bold ${n === current ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong)"}`}>
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
