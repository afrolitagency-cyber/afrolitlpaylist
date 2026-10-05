import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CommentForm } from "@/components/public/CommentForm";
import { ViewBeacon } from "@/components/public/ViewBeacon";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, coverImage: true, publishedAt: true },
  });
  if (!post) return { title: "Not found" };
  return {
    alternates: { canonical: `/blog/${slug}` },
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      artist: { select: { name: true, slug: true } },
      comments: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!post || post.status !== "PUBLISHED") notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    datePublished: post.publishedAt?.toISOString(),
    image: post.coverImage ? [post.coverImage] : undefined,
    description: post.excerpt ?? undefined,
  };

  return (
    <article className="wrap py-8">
      {/* counted via beacon — a cached page runs no server code on view */}
      <ViewBeacon postId={post.id} path={`/blog/${post.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-[760px]">
        <p className="mb-3 text-xs text-(--sub-text)">
          <Link href="/blog" className="hover:text-(--primary)">Blog</Link>
          {post.category ? <> › {post.category.name}</> : null}
        </p>
        <h1 className="text-[clamp(28px,4vw,44px)] font-black leading-tight">{post.title}</h1>
        <p className="mt-4 text-sm text-(--sub-text)">
          {post.publishedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          {post.artist ? <> · <Link href={`/artists/${post.artist.slug}`} className="hover:text-(--primary)">{post.artist.name}</Link></> : null}
        </p>
      </div>

      {post.coverImage ? (
        <div className="relative mx-auto my-7 h-[clamp(220px,40vw,420px)] max-w-[980px] overflow-hidden rounded-xl">
          <Image src={post.coverImage} alt="" fill sizes="980px" className="object-cover" priority />
        </div>
      ) : null}

      <div className="mx-auto max-w-[760px]">
        {post.excerpt ? <p className="mb-6 text-[19px] leading-relaxed">{post.excerpt}</p> : null}

        <div className="text-(--sub-text) [&_strong]:text-(--body-text) [&_h2]:text-(--body-text) [&_h3]:text-(--body-text) [&_blockquote]:text-(--body-text)">
          <BlockRenderer body={post.body} />
        </div>

        {post.tags.length ? (
          <div className="mt-7 flex flex-wrap gap-2">
            {post.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-(--card-bg) px-3 py-1.5 text-[12.5px] text-(--sub-text)">{t}</span>
            ))}
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-extrabold">
            Comments <span className="text-base font-normal text-(--sub-text)">({post.comments.length})</span>
          </h2>

          {post.comments.map((c: { id: string; name: string; body: string; createdAt: Date }) => (
            <div key={c.id} className="border-b border-(--border-strong) py-4">
              <b className="text-sm">{c.name}</b>
              <span className="ml-2 text-xs text-(--sub-text)">{c.createdAt.toLocaleDateString("en-GB")}</span>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-(--sub-text)">{c.body}</p>
            </div>
          ))}

          {post.commentsOn ? (
            <CommentForm postId={post.id} />
          ) : (
            <p className="mt-5 text-sm text-(--sub-text)">Comments are closed on this post.</p>
          )}
        </section>
      </div>
    </article>
  );
}
