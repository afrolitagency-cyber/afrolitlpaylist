import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com"),
  title: { default: "AfroLitPlaylist", template: "%s · AfroLitPlaylist" },
  description: "Afro music — new releases, artists, events and episodes.",
  applicationName: "AfroLitPlaylist",
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" }, // feed discovery in <head>
  },
  openGraph: {
    siteName: "AfroLitPlaylist",
    type: "website",
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image" },
  // Search Console verification. Empty until the token from Search Console is set.
  // Unlike GA, this is a meta tag, not a script, so it needs no consent banner.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-appearance="dark" className={inter.variable} suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
