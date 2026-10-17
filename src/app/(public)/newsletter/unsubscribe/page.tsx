import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { applyListPreference } from "@/lib/newsletter-subscribe";
import { parseList, verifyManageToken } from "@/lib/newsletter-tokens";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; s?: string; t?: string; list?: string }>;
}) {
  const { token, s, t, list: listRaw } = await searchParams;
  const list = parseList(listRaw);
  let done = false;

  if (s && t && verifyManageToken(s, t)) {
    done = await applyListPreference(s, list);
  } else if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { tokenHash } });
    if (sub) {
      done = await applyListPreference(sub.id, "all");
    }
  }

  const copy =
    list === "blog"
      ? "You won't get blog digests. Event emails will continue unless you turn those off too."
      : list === "events"
        ? "You won't get event emails. Blog digests will continue unless you turn those off too."
        : "You won't receive any more emails from us.";

  return (
    <div className="wrap py-16 text-center">
      <h1 className="text-3xl font-black">{done ? "You're unsubscribed" : "We couldn't find that subscription"}</h1>
      <p className="mx-auto mt-3 max-w-md text-(--sub-text)">
        {done ? copy : "The link may have expired. Use Email preferences from a recent issue, or subscribe again."}
      </p>
    </div>
  );
}
