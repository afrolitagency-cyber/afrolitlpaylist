import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseTicketPayload } from "@/lib/ticket-code";

export const dynamic = "force-dynamic";

export default async function TicketLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = parseTicketPayload(decodeURIComponent(raw));
  if (!code) notFound();

  const ticket = await prisma.ticket.findUnique({
    where: { code },
    select: {
      event: { select: { slug: true } },
      order: { select: { reference: true } },
    },
  });
  if (!ticket) notFound();
  if (ticket.order) {
    redirect(`/events/${ticket.event.slug}/order/${ticket.order.reference}`);
  }
  redirect(`/events/${ticket.event.slug}`);
}
