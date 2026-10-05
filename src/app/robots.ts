import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /search is excluded: query strings generate unbounded near-duplicate URLs
        disallow: ["/admin", "/portal", "/api", "/search", "/newsletter/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
