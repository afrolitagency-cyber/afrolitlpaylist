import { signOutAction } from "@/lib/actions/auth";

/** Shared by the staff dashboard and the artist portal. */
export function LogoutButton({ to = "admin" }: { to?: "admin" | "portal" }) {
  return (
    <form action={signOutAction}>
      <input type="hidden" name="to" value={to} />
      <button
        type="submit"
        className="rounded border border-(--border-strong) px-3 py-1.5 text-sm font-semibold text-(--sub-text) hover:text-(--body-text)"
      >
        Log out
      </button>
    </form>
  );
}
