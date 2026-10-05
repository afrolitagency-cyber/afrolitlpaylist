import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe" };

/** One click, no login — anything else makes people mark mail as spam instead. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token, email } = await searchParams;
  let done = false;

  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { tokenHash } });
    if (sub) {
      await prisma.newsletterSubscriber.update({
        where: { id: sub.id },
        data: { status: "UNSUBSCRIBED", tokenHash: null },
      });
      done = true;
    }
  } else if (email) {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (sub) {
      await prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { status: "UNSUBSCRIBED" } });
      done = true;
    }
  }

  return (
    <div className="wrap py-16 text-center">
      <h1 className="text-3xl font-black">{done ? "You're unsubscribed" : "We couldn't find that subscription"}</h1>
      <p className="mx-auto mt-3 max-w-md text-(--sub-text)">
        {done ? "You won't receive any more emails from us." : "It may already have been removed."}
      </p>
    </div>
  );
}
