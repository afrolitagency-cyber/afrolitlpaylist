import { LoginForm } from "@/components/admin/LoginForm";
import { Brand } from "@/components/ui/Logo";

export const metadata = { title: "Sign in" };

export default function AdminLogin() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand size={40} /></div>
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-7">
          <h1 className="text-xl font-bold">Sign in</h1>
          <p className="mb-5 mt-1 text-sm text-(--sub-text)">
            Admin and editor access. Artists sign in through the portal.
          </p>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm">
          <a href="/portal/login" className="text-(--sub-text) hover:text-(--primary)">Artist portal sign-in →</a>
        </p>
      </div>
    </main>
  );
}
