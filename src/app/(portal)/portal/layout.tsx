import Link from "next/link";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession, AuthError } from "@/lib/rbac";
import { Brand } from "@/components/ui/Logo";

/**
 * The portal shows an artist only what they own. The menu is deliberately short:
 * Moments, events, gallery and the site blog are editor-only and never appear.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (
    pathname === "/portal/login" ||
    pathname.startsWith("/portal/login/") ||
    pathname.startsWith("/portal/invite")
  ) {
    return <>{children}</>;
  }

  try {
    await requireSession();
  } catch (err) {
    if (err instanceof AuthError) redirect("/portal/login");
    throw err;
  }

  const links = [
    { href: "/portal", label: "Overview" },
    { href: "/portal/profile", label: "Profile" },
    { href: "/portal/discography", label: "Discography" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-(--border-strong) bg-(--header-bg)">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Link href="/portal"><Brand size={36} /></Link>
          <nav className="flex gap-5 text-sm font-semibold">
            {links.map((l) => (
              <Link key={l.href} href={l.href as Route} className="text-(--sub-text) hover:text-(--body-text)">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap py-8">{children}</main>
    </div>
  );
}
