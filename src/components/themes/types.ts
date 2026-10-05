import type { NavItem } from "@/lib/nav";
import type { SiteIdentity } from "@/lib/settings";

export type HeaderProps = { nav: NavItem[]; identity: SiteIdentity };
export type FooterProps = { nav: NavItem[]; identity: SiteIdentity };

export type Story = {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: string | null;
  publishedAt?: Date | null;
};

export type HeroProps = { lead: Story | null; secondary: Story[] };
export type ArticleCardProps = { story: Story; size?: "sm" | "md" | "lg" };
export type SectionHeadProps = { title: string; href?: string; cta?: string };

/** The only five components a theme is allowed to vary. Everything else —
 *  widgets, forms, tables, the whole admin — is built once and themed by tokens. */
export type ThemeComponents = {
  Header: React.ComponentType<HeaderProps>;
  Hero: React.ComponentType<HeroProps>;
  ArticleCard: React.ComponentType<ArticleCardProps>;
  SectionHead: React.ComponentType<SectionHeadProps>;
  Footer: React.ComponentType<FooterProps>;
};
