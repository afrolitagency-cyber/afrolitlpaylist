import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Clears a sign-in whose role no longer matches the account, then opens staff login. */
export async function GET() {
  await signOut({ redirectTo: "/admin/login", redirect: false });
  redirect("/admin/login");
}
