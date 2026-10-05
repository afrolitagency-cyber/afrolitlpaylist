"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { runAction, type ActionState } from "./_result";

const STATUSES = ["NEW", "OPEN", "REPLIED", "RESOLVED"] as const;
type Status = (typeof STATUSES)[number];

export async function updateMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireRole(...can.moderate);
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
