import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/ui/Pagination";

export const revalidate = 600;
export const metadata = { title: "Gallery" };

const PER_PAGE = 48;

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ collection?: string; page?: string }> }) {
  const { collection, page } = await searchParams;
  const current = Math.max(1, Number(page ?? 1) || 1);

  const where = { published: true, ...(collection ? { collection: { slug: collection } } : {}) };

  const [images, total, collections] = await Promise.all([
    prisma.galleryImage.findMany({
      where,
      orderBy: [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }],
      skip: (current - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.galleryImage.count({ where }),
    prisma.galleryCollection.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="wrap py-8">
      <h1 className="mb-2 text-[clamp(28px,4vw,44px)] font-black">Gallery</h1>
      <p className="mb-6 text-(--sub-text)">Shows, camps, studio sessions and press days.</p>

      {collections.length ? (
        <div className="mb-7 flex flex-wrap gap-2">
          <Link href="/gallery" className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${!collection ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text)"}`}>All</Link>
          {collections.map((c: { slug: string; name: string }) => (
            <Link key={c.slug} href={`/gallery?collection=${c.slug}`}
              className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${collection === c.slug ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text)"}`}>
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {images.length === 0 ? (
        <p className="text-(--sub-text)">No photos published yet.</p>
      ) : (
        <div className="columns-2 gap-3.5 lg:columns-4 [&>figure]:mb-3.5">
          {images.map((img: { id: string; url: string; caption: string | null; altText: string | null; credit: string | null }) => (
            <figure key={img.id} className="group relative break-inside-avoid overflow-hidden rounded-lg">
              <Image src={img.url} alt={img.altText ?? ""} width={600} height={800} className="h-auto w-full" />
              {img.caption ? (
                <figcaption className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 to-transparent p-3.5 text-[13px] text-white opacity-0 transition group-hover:opacity-100">
                  {img.caption}{img.credit ? ` · ${img.credit}` : ""}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      )}
      <Pagination page={current} pages={pages} basePath="/gallery" params={{ collection }} />
    </div>
  );
}
