import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getActiveTheme } from "@/lib/settings";
import { loadTheme } from "@/components/themes/registry";
import { WidgetSidebar } from "@/components/widgets/Sidebar";
import { TrendingAlbums } from "@/components/widgets/TrendingAlbums";
import { NewsletterSignup } from "@/components/public/NewsletterSignup";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/ui/Skeleton";
import type { Story } from "@/components/themes/types";

export const revalidate = 300;

export const metadata = {
  alternates: { canonical: "/" },
  title: "AfroLitPlaylist — Afro music, artists and events",
  description:
    "New releases, artist profiles, events and episodes from across Afro music.",
};

type PostRow = {
  slug: string; title: string; excerpt: string | null; coverImage: string | null;
  publishedAt: Date | null; category: { name: string } | null;
};

export default async function HomePage() {
  const [themeKey, posts] = await Promise.all([
    getActiveTheme(),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: {
        slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const { Hero, ArticleCard, SectionHead } = await loadTheme(themeKey);

  const stories: Story[] = (posts as PostRow[]).map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, coverImage: p.coverImage,
    publishedAt: p.publishedAt, category: p.category?.name ?? null,
  }));
  const [lead, ...rest] = stories;

  const siteLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "AfroLitPlaylist",
        url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com",
        potentialAction: {
          "@type": "SearchAction",
          target: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "AfroLitPlaylist",
        url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com",
      },
    ],
  };

  return (
    <div className="wrap">
      {/* WebSite + Organization: enables the sitelinks search box in Google */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      {lead ? <Hero lead={lead} secondary={rest.slice(0, 3)} /> : null}

      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main>
          <SectionHead title="Latest stories" href="/blog" />
          {stories.length === 0 ? (
            <EmptyState
              title="Nothing published yet"
              body="Once the first post goes live it appears here, and the widgets fill in alongside it."
              action={{ href: "/admin/posts/new", label: "Write the first post" }}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {rest.slice(3).map((s: Story) => <ArticleCard key={s.slug} story={s} />)}
            </div>
          )}

          <Suspense fallback={null}>
            <div className="mt-10"><TrendingAlbums /></div>
          </Suspense>

          <section className="mt-10 rounded-xl bg-(--surface-alt) p-10 text-center">
            <h2 className="mb-2 text-[clamp(26px,3vw,32px)] font-black">Never miss a drop</h2>
            <NewsletterSignup />
          </section>
        </main>

        {/* Streams in separately: the stories render immediately, widgets follow. */}
        <Suspense fallback={<div className="flex flex-col gap-5"><WidgetSkeleton /><WidgetSkeleton /><WidgetSkeleton /></div>}>
          <WidgetSidebar />
        </Suspense>
      </div>
    </div>
  );
}
