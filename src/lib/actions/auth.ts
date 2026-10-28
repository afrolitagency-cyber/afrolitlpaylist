"use server";

import { redirect } from "next/navigation";
import { AuthError as NextAuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { dashboardPath } from "@/lib/dashboard";
import type { ActionState } from "./_result";

async function signInToDashboard(formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    // Deliberately vague: distinguishing "no such user" from "wrong password"
    // tells an attacker which emails exist.
    if (err instanceof NextAuthError) return { ok: false, error: "Email or password is incorrect." };
    throw err;
  }

  const account = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  redirect(dashboardPath(account?.role));
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return signInToDashboard(formData);
}

export async function signInArtistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return signInToDashboard(formData);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const to = String(formData.get("to") ?? "");
  await signOut({ redirectTo: to === "portal" ? "/portal/login" : "/admin/login" });
}
