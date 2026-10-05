import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

/**
 * ONE navigation set, shared by every template. Themes differ in how they render
 * it, never in what it contains — that is what makes templates swappable without
 * breaking links. Series marked showInNav become dropdowns automatically, so
 * adding an AfroQueens Camp event needs no nav edit and no deploy.
 */
export const getNav = cache(async (): Promise<NavItem[]> => {
  const series = await prisma.eventSeries.findMany({
    where: { showInNav: true },
    orderBy: { position: "asc" },
    select: {
      name: true,
      slug: true,
      events: {
        where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: { title: true, slug: true },
      },
    },
  });

  const base: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: "Events", href: "/events" },
    { label: "Artists", href: "/artists" },
    { label: "Gallery", href: "/gallery" },
    { label: "Episodes", href: "/episodes" },
  ];

  type SeriesRow = {
    name: string;
    slug: string;
    events: { title: string; slug: string }[];
  };

  const seriesItems: NavItem[] = (series as SeriesRow[]).map((s) => ({
    label: s.name,
    href: `/events/series/${s.slug}`,
    children: s.events.map((e) => ({ label: e.title, href: `/events/${e.slug}` })),
  }));

  return [...base, ...seriesItems, { label: "Contact Us", href: "/contact" }];
});
