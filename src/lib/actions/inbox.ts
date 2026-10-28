"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireRoleFresh, can } from "@/lib/rbac";
import { upsertSubscribers } from "@/lib/newsletter-subscribe";
import { runAction, type ActionState } from "./_result";

const STATUSES = ["NEW", "OPEN", "REPLIED", "RESOLVED"] as const;
type Status = (typeof STATUSES)[number];

export async function updateMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireRoleFresh(...can.viewInbox);
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    const assign = formData.get("assignToMe") === "on";

    if (!STATUSES.includes(status as Status)) return { ok: false, error: "Unknown status." };

    await prisma.contactMessage.update({
      where: { id },
      data: { status: status as Status, ...(assign ? { assignedToId: user.id } : {}) },
    });

    revalidatePath("/admin/inbox");
    return { ok: true, message: "Message updated." };
  });
}

export async function addInboxToNewsletter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(...can.sendCampaigns);
    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!email) return { ok: false, error: "No email on that message." };
    const summary = await upsertSubscribers(
      [{ email, firstName: name.split(/\s+/)[0] ?? null }],
      { extraTags: ["inbox"], confirmed: true },
    );
    revalidatePath("/admin/inbox");
    revalidatePath("/admin/newsletter/list");
    if (summary.skipped) return { ok: false, error: "Not added — unsubscribed or bounced." };
    return { ok: true, message: summary.created ? "Added to the newsletter list." : "Already on the list — tags updated." };
  });
}
