/** Where a signed-in account belongs. Artists never share the staff dashboard. */
export function dashboardPath(role: string | null | undefined) {
  if (role === "ARTIST") return "/portal" as const;
  if (role === "DOOR") return "/admin/scan" as const;
  return "/admin" as const;
}
