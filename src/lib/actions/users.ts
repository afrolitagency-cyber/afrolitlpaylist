"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { createInvite } from "@/lib/services/invite";
import { sendArtistInvite } from "@/lib/services/email";
import { runAction, type ActionState } from "./_result";

const roleEnum = z.enum(["ADMIN", "EDITOR", "ARTIST"]);

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.manageUsers);
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const role = roleEnum.parse(formData.get("role"));
    if (!email.includes("@")) return { ok: false, error: "That email doesn't look right." };

    const token = await createInvite(email, undefined, actor.id);
    await prisma.invite.updateMany({ where: { email, acceptedAt: null }, data: { role } });
    const sent = await sendArtistInvite(email, token);
    if (!sent) {
      return { ok: false, error: "The invite was saved, but the email did not send. Check Resend, then send it again." };
    }

    revalidatePath("/admin/users");
    return { ok: true, message: `Invite sent to ${email}.` };
  });
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.manageUsers);
    const id = String(formData.get("id") ?? "");
    const action = String(formData.get("action") ?? "");

    // An admin who demotes or suspends themselves locks everyone out of settings.
    if (id === actor.id) return { ok: false, error: "You can't change your own access here." };

    if (action === "suspend" || action === "activate") {
      await prisma.user.update({
        where: { id },
        data: { status: action === "suspend" ? "SUSPENDED" : "ACTIVE" },
      });
    } else if (action === "role") {
      const role = roleEnum.parse(formData.get("role"));
      // Never remove the last admin — the account that could restore access.
      if (role !== "ADMIN") {
        const admins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
        const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (admins <= 1 && target?.role === "ADMIN") {
          return { ok: false, error: "This is the last admin. Promote someone else first." };
        }
      }
      await prisma.user.update({ where: { id }, data: { role } });
    } else {
      return { ok: false, error: "Unknown action." };
    }

    revalidatePath("/admin/users");
    return { ok: true, message: "User updated." };
  });
}
