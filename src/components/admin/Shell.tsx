import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Role } from "@prisma/client";

type Item = { label: string; href: string; roles?: Role[]; badge?: number };

const NAV: Item[] = [
  { label: "Overview", href: "/admin" },
  { label: "Artist submissions", href: "/admin/artists?status=PENDING", roles: ["ADMIN"] },
  { label: "Comments", href: "/admin/comments" },
  { label: "Posts", href: "/admin/posts" },
  { label: "Artists", href: "/admin/artists" },
  { label: "Events", href: "/admin/events" },
  { label: "Episodes", href: "/admin/episodes" },
  { label: "Gallery", href: "/admin/gallery" },
  { label: "Newsletter", href: "/admin/newsletter", roles: ["ADMIN"] },
  { label: "Contact inbox", href: "/admin/inbox" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Media library", href: "/admin/media" },
  { label: "Categories", href: "/admin/taxonomy" },
  { label: "Email templates", href: "/admin/emails", roles: ["ADMIN"] },
  { label: "Users", href: "/admin/users", roles: ["ADMIN"] },
  { label: "Settings", href: "/admin/settings", roles: ["ADMIN"] },
];

/** The sidebar hides what the role cannot use — but hiding is cosmetic only.
 *  Enforcement lives in requireRole(); the menu is never the gate. */
export function AdminShell({
  role,
  email,
  title,
  subtitle,
  actions,
  children,
}: {
  role: Role;
  email: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const visible = NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
      <aside className="hidden flex-col border-r border-(--border-strong) bg-(--surface) lg:flex">
        <div className="flex items-center gap-2.5 border-b border-(--border-strong) p-5">
          <LogoMark size={34} />
          <div>
            <b className="block text-[15px] font-black">
              AFRO<em className="not-italic text-(--primary)">LIT</em>PLAYLIST
            </b>
            <span className="text-[10.5px] font-semibold tracking-wider text-(--sub-text)">ADMIN CMS</span>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          {visible.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-(--sub-text) hover:bg-(--surface-alt) hover:text-(--body-text)"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-(--border-strong) p-3.5 text-sm">
          <b className="block truncate">{email}</b>
          <span className="text-xs capitalize text-(--sub-text)">{role.toLowerCase()}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-(--border-strong) bg-(--body-bg) px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-(--sub-text)">{subtitle}</p> : null}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            {actions}
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    PUBLISHED: "bg-emerald-500/15 text-emerald-400",
    LIVE: "bg-emerald-500/15 text-emerald-400",
    DRAFT: "bg-(--surface-alt) text-(--sub-text)",
    PENDING: "bg-amber-500/15 text-amber-300",
    CHANGES_REQUESTED: "bg-orange-500/15 text-orange-300",
    REJECTED: "bg-(--primary)/15 text-(--primary)",
    SCHEDULED: "bg-amber-500/15 text-amber-300",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold ${tone[status] ?? tone.DRAFT}`}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
