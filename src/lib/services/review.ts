import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * The artist review loop.
 *
 *   submit            → PENDING, changes written to pendingProfile
 *   request changes   → CHANGES_REQUESTED + reviewNote (note required), email sent
 *   resubmit          → the SAME blob is overwritten, status back to PENDING, note cleared
 *   approve           → blob merges into the live row and clears
 *   reject            → REJECTED, blob kept for reference
 *
 * One open review per artist: the blob is live working state, never a queue.
 * Every decision also appends an ArtistReviewEvent — that append-only log is
 * what the review screen's history panel reads, since the blob keeps no history.
 */

export const REVIEWABLE_FIELDS = [
  "name",
  "genre",
  "location",
  "bio",
  "coverImage",
  "avatarImage",
  "streamEmbedUrl",
  "socials",
] as const;

export type ReviewableField = (typeof REVIEWABLE_FIELDS)[number];
export type PendingProfile = Partial<Record<ReviewableField, unknown>>;

export async function submitForReview(artistId: string, changes: PendingProfile) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const artist = await tx.artist.update({
      where: { id: artistId },
      data: {
        pendingProfile: changes as Prisma.InputJsonValue,
        status: "PENDING",
        reviewNote: null, // a resubmission clears the previous note
        submittedAt: new Date(),
      },
    });
    await tx.artistReviewEvent.create({
      data: {
        artistId,
        decision: "SUBMITTED",
        snapshot: changes as Prisma.InputJsonValue,
      },
    });
    return artist;
  });
}

export async function approve(artistId: string, actorId: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.artist.findUniqueOrThrow({ where: { id: artistId } });
    const pending = (current.pendingProfile ?? {}) as PendingProfile;

    // only whitelisted fields are merged — never spread the blob blindly
    const merged: Record<string, unknown> = {};
    for (const key of REVIEWABLE_FIELDS) {
      if (key in pending) merged[key] = pending[key];
    }

    const artist = await tx.artist.update({
      where: { id: artistId },
      data: { ...merged, status: "LIVE", pendingProfile: Prisma.DbNull, reviewNote: null },
    });
    await tx.artistReviewEvent.create({
      data: { artistId, decision: "APPROVED", actorId, snapshot: pending as Prisma.InputJsonValue },
    });
    return artist;
  });
}

export async function requestChanges(artistId: string, actorId: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("A note is required when requesting changes");

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const artist = await tx.artist.update({
      where: { id: artistId },
      data: { status: "CHANGES_REQUESTED", reviewNote: trimmed },
    });
    await tx.artistReviewEvent.create({
      data: { artistId, decision: "CHANGES_REQUESTED", actorId, note: trimmed },
    });
    return artist;
  });
}

export async function reject(artistId: string, actorId: string, note?: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const artist = await tx.artist.update({
      where: { id: artistId },
      data: { status: "REJECTED", reviewNote: note?.trim() || null },
    });
    await tx.artistReviewEvent.create({
      data: { artistId, decision: "REJECTED", actorId, note: note?.trim() || null },
    });
    return artist;
  });
}

/** Current live values beside submitted ones, for the review screen's diff. */
export function buildDiff(
  live: Record<string, unknown>,
  pending: PendingProfile,
): { field: ReviewableField; before: unknown; after: unknown }[] {
  return REVIEWABLE_FIELDS.filter((f) => f in pending && pending[f] !== live[f]).map((f) => ({
    field: f,
    before: live[f] ?? null,
    after: pending[f] ?? null,
  }));
}
