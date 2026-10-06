import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uniqueSlug } from "@/lib/services/slug";

/**
 * Invites: the raw token goes in the email, only its hash is stored. A database
 * leak therefore cannot be replayed into account takeovers.
 */
export function newToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createInvite(email: string, artistId?: string, issuedById?: string) {
  const { raw, hash } = newToken();
  await prisma.invite.create({
    data: {
      email: email.toLowerCase().trim(),
      role: "ARTIST",
      tokenHash: hash,
      artistId: artistId ?? null,
      issuedById: issuedById ?? null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
    },
  });
  return raw; // caller emails this; it is never persisted
}

export async function findValidInvite(rawToken: string) {
  const invite = await prisma.invite.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!invite) return null;
  if (invite.acceptedAt) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;
  return invite;
}

/** Accepting binds the new User to the pre-created Artist shell. */
export async function acceptInvite(rawToken: string, password: string, name?: string) {
  const invite = await findValidInvite(rawToken);
  if (!invite) throw new Error("This invite link is invalid or has expired.");
  if (password.length < 10) throw new Error("Use at least 10 characters.");

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.upsert({
      where: { email: invite.email },
      create: { email: invite.email, name: name ?? null, role: invite.role, status: "ACTIVE", passwordHash },
      update: { status: "ACTIVE", passwordHash, role: invite.role },
    });

    if (invite.artistId) {
      await tx.artist.update({ where: { id: invite.artistId }, data: { userId: user.id } });
    } else if (invite.role === "ARTIST") {
      const existing = await tx.artist.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!existing) {
        const displayName = (user.name?.trim() || invite.email.split("@")[0] || "Artist").slice(0, 120);
        const slug = await uniqueSlug("artist", displayName);
        await tx.artist.create({ data: { name: displayName, slug, userId: user.id, status: "DRAFT" } });
      }
    }

    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return user;
  });
}
