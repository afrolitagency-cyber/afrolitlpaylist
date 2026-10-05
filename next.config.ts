import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
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
