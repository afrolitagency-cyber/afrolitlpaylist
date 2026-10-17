import { prisma } from "@/lib/prisma";
import { PreferencesForm } from "@/components/public/PreferencesForm";
import { verifyManageToken } from "@/lib/newsletter-tokens";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email preferences" };

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; t?: string }>;
}) {
  const { s, t } = await searchParams;
  const ok = Boolean(s && t && verifyManageToken(s, t));
  const sub = ok && s ? await prisma.newsletterSubscriber.findUnique({ where: { id: s } }) : null;

  return (
    <div className="wrap py-16">
      <h1 className="mb-3 text-center text-3xl font-black">Email preferences</h1>
      {!sub ? (
        <p className="mx-auto max-w-md text-center text-(--sub-text)">
          This link isn&apos;t valid. Use Email preferences from a recent newsletter.
        </p>
      ) : (
        <PreferencesForm
          s={sub.id}
          t={t!}
          email={sub.email}
          firstName={sub.firstName ?? ""}
          wantsBlog={sub.wantsBlog}
          wantsEvents={sub.wantsEvents}
        />
      )}
    </div>
  );
}
