import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Clears a sign-in whose role no longer matches the account, then opens artist login. */
export async function GET() {
  await signOut({ redirectTo: "/portal/login", redirect: false });
  redirect("/portal/login");
}
