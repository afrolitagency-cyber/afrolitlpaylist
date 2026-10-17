import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your subscription" };

/** Double opt-in landing. The emailed token is matched against its stored hash. */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;

  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { tokenHash } });
    const expired = sub?.confirmExpiresAt ? sub.confirmExpiresAt.getTime() < Date.now() : false;
    if (sub && !expired && sub.status !== "UNSUBSCRIBED" && sub.status !== "BOUNCED" && sub.status !== "COMPLAINED") {
      await prisma.newsletterSubscriber.update({
        where: { id: sub.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          tokenHash: null,
          confirmExpiresAt: null,
        },
      });
      void track({ name: "newsletter_confirm", path: "/newsletter/confirm" });
      ok = true;
    }
  }

  return (
    <div className="wrap py-16 text-center">
      <h1 className="text-3xl font-black">{ok ? "You're subscribed" : "This link didn't work"}</h1>
      <p className="mx-auto mt-3 max-w-md text-(--sub-text)">
        {ok
          ? "Thanks for confirming. New music, event alerts and artist stories are on their way."
          : "Confirmation links expire once used. Subscribe again and we'll send a fresh one."}
      </p>
    </div>
  );
}
