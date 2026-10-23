import Link from "next/link";
import type { Route } from "next";
import type { Role } from "@prisma/client";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type IconName =
  | "overview"
  | "submissions"
  | "comments"
  | "posts"
  | "artists"
  | "albums"
  | "events"
  | "episodes"
  | "gallery"
  | "newsletter"
  | "inbox"
  | "analytics"
  | "media"
  | "ads"
  | "categories"
  | "emails"
  | "users"
  | "settings"
  | "payments"
  | "scan";

type Item = { label: string; href: string; icon: IconName; roles?: Role[]; artist?: boolean; badge?: number };

const NAV: Item[] = [
  { label: "Overview", href: "/admin", icon: "overview" },
  { label: "Artist submissions", href: "/admin/artists?status=PENDING", icon: "submissions", artist: true },
  { label: "Comments", href: "/admin/comments", icon: "comments" },
  { label: "Posts", href: "/admin/posts", icon: "posts" },
  { label: "Artists", href: "/admin/artists", icon: "artists", artist: true },
  { label: "Albums", href: "/admin/albums", icon: "albums", artist: true },
  { label: "Events", href: "/admin/events", icon: "events" },
  { label: "Ticket payments", href: "/admin/payments", icon: "payments", roles: ["SUPERADMIN", "ADMIN", "EDITOR"] },
  { label: "Door scan", href: "/admin/scan", icon: "scan", roles: ["SUPERADMIN", "ADMIN", "EDITOR", "DOOR"] },
  { label: "Episodes", href: "/admin/episodes", icon: "episodes" },
  { label: "Gallery", href: "/admin/gallery", icon: "gallery" },
  { label: "Newsletter", href: "/admin/newsletter", icon: "newsletter", roles: ["SUPERADMIN", "ADMIN"] },
  { label: "Contact inbox", href: "/admin/inbox", icon: "inbox" },
  { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
  { label: "Media library", href: "/admin/media", icon: "media" },
  { label: "Ads", href: "/admin/ads", icon: "ads", roles: ["SUPERADMIN", "ADMIN"] },
  { label: "Categories", href: "/admin/taxonomy", icon: "categories" },
  { label: "Email templates", href: "/admin/emails", icon: "emails", roles: ["SUPERADMIN", "ADMIN"] },
  { label: "Users", href: "/admin/users", icon: "users", roles: ["SUPERADMIN", "ADMIN"] },
  { label: "Settings", href: "/admin/settings", icon: "settings", roles: ["SUPERADMIN", "ADMIN"] },
];

function NavIcon({ name }: { name: IconName }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "shrink-0",
  };
  switch (name) {
    case "overview":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "submissions":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      );
    case "comments":
      return (
        <svg {...props}>
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0z" />
        </svg>
      );
    case "posts":
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M8 13h8M8 17h5" />
        </svg>
      );
    case "artists":
      return (
        <svg {...props}>
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
          <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
        </svg>
      );
    case "albums":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
      );
    case "events":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "episodes":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 9.5v5l5-2.5z" />
        </svg>
      );
    case "gallery":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M21 16l-5-5-9 8" />
        </svg>
      );
    case "newsletter":
      return (
        <svg {...props}>
          <path d="M4 6h16v12H4z" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...props}>
          <path d="M3 13l2-8h14l2 8" />
          <path d="M3 13h5a3 3 0 0 0 6 0h5v6H3z" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...props}>
          <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />
        </svg>
      );
    case "ads":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 10h4M7 14h10" />
        </svg>
      );
    case "media":
      return (
        <svg {...props}>
          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "categories":
      return (
        <svg {...props}>
          <path d="M20 13l-7 7-9-9V4h7z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </svg>
      );
    case "emails":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" />
        </svg>
      );
    case "payments":
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "scan":
      return (
        <svg {...props}>
          <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
          <path d="M7 12h10" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

/** The sidebar hides what the role cannot use — but hiding is cosmetic only.
 *  Enforcement lives in requireRole(); the menu is never the gate.
 *  The role is read from the database so a promotion shows up before the JWT refreshes. */
export async function AdminShell({
  role: roleProp,
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
  const session = await auth();
  let role = roleProp;
  let artistAccess = roleProp === "SUPERADMIN";
  if (session?.user?.id) {
    const fresh = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, artistAccess: true, status: true },
    });
    if (fresh && fresh.status === "ACTIVE") {
      role = fresh.role;
      artistAccess = fresh.role === "SUPERADMIN" || (fresh.role === "ADMIN" && fresh.artistAccess);
    }
  }
  const visible = NAV.filter((i) => {
    if (i.artist && !artistAccess) return false;
    if (i.roles && !i.roles.includes(role)) return false;
    return true;
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
      <aside className="hidden flex-col border-r border-(--border-strong) bg-(--surface) lg:flex">
        <div className="flex items-center gap-2.5 border-b border-(--border-strong) p-5">
          <LogoMark size={34} />
          <div>
            <b className="block text-[15px] font-black">
              AFRO<em className="not-italic text-(--primary)">LIT</em>PLAYLIST
            </b>
            <span className="text-[10.5px] font-semibold tracking-wider text-(--sub-text)">
              {role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN CMS"}
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          {visible.map((i) => (
            <Link
              key={i.href}
              href={i.href as Route}
              className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-(--sub-text) hover:bg-(--surface-alt) hover:text-(--body-text)"
            >
              <NavIcon name={i.icon} />
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
    SENDING: "bg-sky-500/15 text-sky-300",
    SENT: "bg-emerald-500/15 text-emerald-400",
    PAID: "bg-emerald-500/15 text-emerald-400",
    FAILED: "bg-(--primary)/15 text-(--primary)",
    REFUNDED: "bg-orange-500/15 text-orange-300",
    EXPIRED: "bg-(--surface-alt) text-(--sub-text)",
    CANCELED: "bg-(--surface-alt) text-(--sub-text)",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold ${tone[status] ?? tone.DRAFT}`}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
