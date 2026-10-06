import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/afro-queen-recording-camp", destination: "/events/series/afroqueens-camp", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: { typedRoutes: true },
  // BlockNote ships ESM with CSS subpath exports. Transpiling lets both the
  // webpack and Turbopack pipelines resolve them the same way.
  transpilePackages: ["@blocknote/core", "@blocknote/react", "@blocknote/mantine"],
};

export default config;
