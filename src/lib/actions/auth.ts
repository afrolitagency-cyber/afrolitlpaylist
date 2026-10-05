"use server";

import { redirect } from "next/navigation";
import { AuthError as NextAuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import type { ActionState } from "./_result";

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    // Deliberately vague: distinguishing "no such user" from "wrong password"
    // tells an attacker which emails exist.
    if (err instanceof NextAuthError) return { ok: false, error: "Email or password is incorrect." };
    throw err;
  }
  redirect("/admin");
}

export async function signInArtistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof NextAuthError) return { ok: false, error: "Email or password is incorrect." };
    throw err;
  }
  redirect("/portal");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
