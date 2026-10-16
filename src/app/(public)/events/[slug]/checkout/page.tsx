import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CheckoutClient } from "@/components/public/checkout/CheckoutClient";
import { eventHasCheckout, eventWhenLabel, listCheckoutTiers } from "@/lib/checkout";
import { paystackConfigured } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await prisma.event.findUnique({ where: { slug }, select: { title: true } });
  return { title: e ? `Tickets · ${e.title}` : "Checkout" };
}

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, status: true, ticketed: true, soldOut: true,
      startsAt: true, timezone: true, venue: true, city: true, coverImage: true,
    },
  });
  if (!event || event.status !== "PUBLISHED" || !event.ticketed) notFound();
  const ready = await eventHasCheckout(event.id);
  if (!ready) notFound();

  const tiers = await listCheckoutTiers(event.id, event.timezone);
  const venue = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <div className="wrap py-[clamp(18px,3vw,34px)]">
      <CheckoutClient
        eventId={event.id}
        slug={event.slug}
        title={event.title}
        when={eventWhenLabel(event.startsAt, event.timezone)}
        venue={venue}
        coverImage={event.coverImage}
        paystackReady={paystackConfigured()}
        tiers={tiers}
      />
    </div>
  );
}
