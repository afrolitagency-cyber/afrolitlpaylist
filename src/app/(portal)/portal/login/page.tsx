import { PortalLoginForm } from "@/components/portal/LoginForm";
import { Brand } from "@/components/ui/Logo";

export const metadata = { title: "Artist sign in" };

export default function PortalLogin() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand size={40} /></div>
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-7">
          <h1 className="text-xl font-bold">Artist sign in</h1>
          <p className="mb-5 mt-1 text-sm text-(--sub-text)">Manage your profile and discography.</p>
          <PortalLoginForm />
        </div>
      </div>
    </main>
  );
}
