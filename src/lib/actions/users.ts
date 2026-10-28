"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assignableRoles, requireArtistAccess, requireRoleFresh, can } from "@/lib/rbac";
import { createInvite } from "@/lib/services/invite";
import { sendAccountInvite } from "@/lib/services/email";
import { runAction, type ActionState } from "./_result";

const roleEnum = z.enum(["SUPERADMIN", "ADMIN", "EDITOR", "ARTIST", "DOOR"]);

function canAssign(actor: Role, role: Role) {
  return assignableRoles(actor).includes(role);
}

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.manageUsers);
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const role = roleEnum.parse(formData.get("role"));
    if (!email.includes("@")) return { ok: false, error: "That email doesn't look right." };
    if (!canAssign(actor.role, role)) return { ok: false, error: "You can't assign that role." };
    if (role === "ARTIST") await requireArtistAccess();

    const token = await createInvite(email, undefined, actor.id, role);
    const sent = await sendAccountInvite(email, token, role);
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

    if (id === actor.id) return { ok: false, error: "You can't change your own access here." };

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true, status: true },
    });
    if (!target) return { ok: false, error: "That account no longer exists." };
    if (actor.role !== "SUPERADMIN" && (target.role === "SUPERADMIN" || target.role === "ADMIN")) {
      return { ok: false, error: "Only a superadmin can change an admin." };
    }

    if (action === "artistAccess") {
      if (actor.role !== "SUPERADMIN") {
        return { ok: false, error: "Only a superadmin can authorize artist access." };
      }
      if (target.role !== "ADMIN") {
        return { ok: false, error: "Artist access is granted to an admin." };
      }
      await prisma.user.update({
        where: { id },
        data: { artistAccess: formData.get("artistAccess") === "true" },
      });
    } else if (action === "suspend" || action === "activate") {
      if (action === "suspend" && target.role === "SUPERADMIN" && target.status === "ACTIVE") {
        const supers = await prisma.user.count({ where: { role: "SUPERADMIN", status: "ACTIVE" } });
        if (supers <= 1) return { ok: false, error: "This is the last superadmin. Promote someone else first." };
      }
      await prisma.user.update({
        where: { id },
        data: { status: action === "suspend" ? "SUSPENDED" : "ACTIVE" },
      });
    } else if (action === "delete") {
      if (target.role === "SUPERADMIN") {
        const supers = await prisma.user.count({ where: { role: "SUPERADMIN", status: "ACTIVE" } });
        if (supers <= 1) return { ok: false, error: "This is the last superadmin. Promote someone else first." };
      }
      await prisma.mediaAsset.updateMany({ where: { uploadedById: id }, data: { uploadedById: null } });
      await prisma.user.delete({ where: { id } });
      revalidatePath("/admin/users");
      return { ok: true, message: "Login deleted. Their posts and artist page stay on the site." };
    } else if (action === "role") {
      const role = roleEnum.parse(formData.get("role"));
      if (!canAssign(actor.role, role)) return { ok: false, error: "You can't assign that role." };
      if (role === "ARTIST") await requireArtistAccess();
      if (target.role === "SUPERADMIN" && role !== "SUPERADMIN") {
        const supers = await prisma.user.count({ where: { role: "SUPERADMIN", status: "ACTIVE" } });
        if (supers <= 1) return { ok: false, error: "This is the last superadmin. Promote someone else first." };
      }
      await prisma.user.update({
        where: { id },
        data: { role, artistAccess: role === "ADMIN" ? undefined : false },
      });
    } else {
      return { ok: false, error: "Unknown action." };
    }

    revalidatePath("/admin/users");
    return { ok: true, message: "User updated." };
  });
}
