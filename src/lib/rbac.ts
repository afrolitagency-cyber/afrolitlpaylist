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

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("UNAUTHENTICATED");
  return { id: session.user.id, email: session.user.email, role: session.user.role };
}

/** Role check against the JWT claim. Fine for reads and routine writes. */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!allowed.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

/**
 * Role check against the DATABASE, not the token.
 * Use for sensitive actions — approve/reject artists, publish, delete, invite,
 * send campaigns, change settings — so a demoted or suspended user cannot keep
 * acting on a stale claim until their JWT expires.
 */
export async function requireRoleFresh(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireSession();
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!fresh || fresh.status !== "ACTIVE") throw new AuthError("FORBIDDEN");
  if (!allowed.includes(fresh.role)) throw new AuthError("FORBIDDEN");
  return { id: fresh.id, email: fresh.email, role: fresh.role };
}

/** Artists may only touch their own rows. Ownership is checked, never assumed. */
export async function requireOwnArtist(artistId: string): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role === "ADMIN" || user.role === "EDITOR") return user;
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { userId: true },
  });
  if (!artist || artist.userId !== user.id) throw new AuthError("FORBIDDEN");
  return user;
}

export const can = {
  manageContent: ["ADMIN", "EDITOR"] as Role[],
  moderate: ["ADMIN", "EDITOR"] as Role[],
  reviewArtists: ["ADMIN"] as Role[],
  sendCampaigns: ["ADMIN"] as Role[],
  manageUsers: ["ADMIN"] as Role[],
  manageSettings: ["ADMIN"] as Role[],
};
