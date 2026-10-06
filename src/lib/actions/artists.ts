"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, requireOwnArtist, can } from "@/lib/rbac";
import { artistProfileInput, reviewDecisionInput } from "@/lib/validation";
import { approve, reject, requestChanges, submitForReview } from "@/lib/services/review";
import { sendChangesRequested, sendProfileApproved } from "@/lib/services/email";
import { track } from "@/lib/analytics";
import { runAction, type ActionState } from "./_result";

/** Artist-side: save changes into the pending blob and submit for review. */
export async function submitProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const artistId = String(formData.get("artistId") ?? "");
    await requireOwnArtist(artistId); // ownership, not just role

    const data = artistProfileInput.parse({
      name: formData.get("name"),
      genre: formData.get("genre") || null,
      location: formData.get("location") || null,
      bio: formData.get("bio") || null,
      coverImage: formData.get("coverImage") || null,
      avatarImage: formData.get("avatarImage") || null,
      streamEmbedUrl: formData.get("streamEmbedUrl") || null,
    });

    if (!data.avatarImage || !data.bio) {
      return { ok: false, error: "A profile photo and a bio are required before submitting." };
    }

    await submitForReview(artistId, data);
    revalidatePath("/portal/profile");
    revalidatePath("/admin/artists");
    void track({ name: "artist_submit_profile", entityId: artistId, path: "/portal/profile" });
    return { ok: true, message: "Submitted for review." };
  });
}

/** Admin-side: approve, request changes (note required), or reject. */
export async function decideReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.reviewArtists); // ADMIN only, fresh

    const input = reviewDecisionInput.parse({
      artistId: formData.get("artistId"),
      decision: formData.get("decision"),
      note: formData.get("note") || undefined,
    });

    if (input.decision === "APPROVED") await approve(input.artistId, actor.id);
    else if (input.decision === "REJECTED") await reject(input.artistId, actor.id, input.note);
    else await requestChanges(input.artistId, actor.id, input.note ?? "");

    const artist = await prisma.artist.findUnique({
      where: { id: input.artistId },
      select: { slug: true, name: true, user: { select: { email: true } } },
    });

    // Notify after the decision has committed. A failed send must never undo it.
    const notify = artist?.user?.email;
    if (notify && input.decision === "CHANGES_REQUESTED") {
      await sendChangesRequested(notify, artist.name, input.note ?? "");
    } else if (notify && input.decision === "APPROVED") {
      await sendProfileApproved(notify, artist.name, artist.slug);
    }

    revalidateTag("artists");
    revalidatePath("/admin/artists");
    if (artist) revalidatePath(`/artists/${artist.slug}`);

    return {
      ok: true,
      message:
        input.decision === "APPROVED"
          ? "Approved and published."
          : input.decision === "REJECTED"
            ? "Submission rejected."
            : "Changes requested — the artist has been notified.",
    };
  });
}

/** Safety valve: discography publishes without review, so admin can unpublish. */
export async function setReleaseVisibility(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.manageContent);
    const id = String(formData.get("releaseId") ?? "");
    const published = formData.get("published") === "true";
    const release = await prisma.discography.update({ where: { id }, data: { published } });
    revalidatePath("/admin/artists");
    revalidateTag("artists");
    return { ok: true, message: published ? "Release restored." : "Release unpublished." };
  });
}
