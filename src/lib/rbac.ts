import { cache } from "react";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Authorisation is DEFAULT-DENY. Every admin/portal Server Action and Route
 * Handler opens with one of these. They THROW — they never return null — so a
 * forgotten check fails closed instead of silently allowing the request.
 *
 * The common bug this exists to prevent: writing an *authentication* check
 * ("is someone logged in") where an *authorisation* check belongs, which lets
 * any signed-in artist hand-craft a request to an admin endpoint.
 */

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN", message?: string) {
    super(message ?? code);
  }
}

export type SessionUser = { id: string; email: string; role: Role };

const accountFor = cache(async (id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, status: true, artistAccess: true },
  }),
);

/** Sign-in token no longer matches the account. The reset route clears the cookie. */
function reauth(role: Role | null | undefined): never {
  const to = role === "ARTIST" ? "/api/session/reset/portal" : "/api/session/reset/admin";
  redirect(to as Route);
}

/**
 * Ends the sign-in when the token's role or the account status disagrees with
 * the database. Login pages call this because they do not pass through requireSession.
 */
export async function signOutIfStale(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const fresh = await accountFor(session.user.id);
  if (!fresh || fresh.status !== "ACTIVE" || fresh.role !== session.user.role) reauth(fresh?.role);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("UNAUTHENTICATED");
  const fresh = await accountFor(session.user.id);
  if (!fresh || fresh.status !== "ACTIVE" || fresh.role !== session.user.role) reauth(fresh?.role);
  return { id: fresh.id, email: fresh.email, role: fresh.role };
}

/** Role check. A sign-in that disagrees with the database is ended first. */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!allowed.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

/**
 * Same database check as requireSession, then the role list.
 * Use for sensitive actions — approve/reject artists, publish, delete, invite,
 * send campaigns, change settings.
 */
export async function requireRoleFresh(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!allowed.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

/**
 * Create, invite, and register artists. Superadmin always. An admin only after
 * the superadmin has set artistAccess. Editors never.
 */
export async function requireArtistAccess(): Promise<SessionUser> {
  const user = await requireRoleFresh("SUPERADMIN", "ADMIN");
  if (user.role === "SUPERADMIN") return user;
  const row = await accountFor(user.id);
  if (!row?.artistAccess) throw new AuthError("FORBIDDEN");
  return user;
}

/** Page gate. A missing grant returns to the dashboard instead of a 500. */
export async function requireArtistPage(): Promise<SessionUser> {
  try {
    return await requireArtistAccess();
  } catch (err) {
    if (err instanceof AuthError) redirect(err.code === "UNAUTHENTICATED" ? "/admin/login" : "/admin");
    throw err;
  }
}

/** Artists may only touch their own rows. Ownership is checked, never assumed. */
export async function requireOwnArtist(artistId: string): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role === "SUPERADMIN") return user;
  if (user.role === "ADMIN") {
    const fresh = await accountFor(user.id);
    if (fresh?.artistAccess) return user;
  }
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { userId: true },
  });
  if (!artist || artist.userId !== user.id) throw new AuthError("FORBIDDEN");
  return user;
}

export function assignableRoles(actor: Role): Role[] {
  if (actor === "SUPERADMIN") return ["SUPERADMIN", "ADMIN", "EDITOR", "ARTIST", "DOOR"];
  if (actor === "ADMIN") return ["EDITOR", "ARTIST", "DOOR"];
  return [];
}

export const can = {
  manageContent: ["SUPERADMIN", "ADMIN", "EDITOR"] as Role[],
  moderate: ["SUPERADMIN", "ADMIN", "EDITOR"] as Role[],
  sendCampaigns: ["SUPERADMIN", "ADMIN"] as Role[],
  manageUsers: ["SUPERADMIN", "ADMIN"] as Role[],
  manageSettings: ["SUPERADMIN", "ADMIN"] as Role[],
  /** Order list, export, and resend. Editors sell nothing and do not see this. */
  viewPayments: ["SUPERADMIN", "ADMIN"] as Role[],
  /** Public contact mail. Editors moderate comments, not private messages. */
  viewInbox: ["SUPERADMIN", "ADMIN"] as Role[],
  /** Site-wide audience numbers. */
  viewAnalytics: ["SUPERADMIN", "ADMIN"] as Role[],
  /** Scanner-only. Must never be added to manageContent. */
  scanDoor: ["SUPERADMIN", "ADMIN", "EDITOR", "DOOR"] as Role[],
};
