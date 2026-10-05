import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Editor styles are imported here, in a server component, rather than inside the
// client editor. Package CSS imported from a "use client" module is the case
// Turbopack resolves inconsistently; from a layout it is a plain static import
// and both bundlers treat it identically.
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { requireRole, AuthError, can } from "@/lib/rbac";

/** Guards the whole group. Individual actions still re-check — a layout guard
 *  protects rendering, never mutations. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return <>{children}</>;
  }

  try {
    await requireRole(...can.manageContent);
  } catch (err) {
    if (err instanceof AuthError) redirect(err.code === "UNAUTHENTICATED" ? "/admin/login" : "/portal");
    throw err;
  }
  return <>{children}</>;
}
