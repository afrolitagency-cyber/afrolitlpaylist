import { findValidInvite } from "@/lib/services/invite";
import { InviteForm } from "@/components/portal/InviteForm";
import { Brand } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accept your invite" };

export default async function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findValidInvite(token);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand size={40} /></div>
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-7">
          {invite ? (
            <>
              <h1 className="text-xl font-bold">Set your password</h1>
              <p className="mb-5 mt-1 text-sm text-(--sub-text)">
                You&apos;ve been invited to manage an artist profile on AfroLitPlaylist.
              </p>
              <InviteForm token={token} email={invite.email} />
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">This link has expired</h1>
              <p className="mt-2 text-sm text-(--sub-text)">
                Invite links last 14 days and can only be used once. Ask the team for a new one.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
