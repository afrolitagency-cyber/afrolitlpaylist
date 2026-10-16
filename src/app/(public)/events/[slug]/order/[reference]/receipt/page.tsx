import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fulfillPaidOrder } from "@/lib/orders";
import { formatKoboExact } from "@/lib/money";
import { formatTime } from "@/lib/events";
import { ReceiptPrint } from "@/components/public/order/ReceiptPrint";
import styles from "@/components/public/order/receipt.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Receipt" };
}

function fmtDay(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function fmtPaid(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;
  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      event: {
        select: {
          slug: true, title: true, startsAt: true, doorsAt: true, timezone: true,
          venue: true, city: true,
        },
      },
      items: { include: { tier: { select: { name: true, admitsCount: true } } } },
      tickets: true,
    },
  });
  if (!order || order.event.slug !== slug) notFound();

  let status = order.status;
  if (status === "PENDING") {
    const settled = await fulfillPaidOrder(reference);
    if (settled.ok) status = settled.order.status;
  }

  const tz = order.event.timezone;
  const venue = [order.event.venue, order.event.city].filter(Boolean).join(", ");
  const ticketCount = order.tickets.length || order.items.reduce((n, i) => n + i.quantity, 0);
  const issued = order.paidAt ?? order.createdAt;

  if (status !== "PAID") {
    return (
      <div className={styles.body}>
        <div className={styles.wait}>
          <h1>Receipt</h1>
          <p>This order is not paid yet. Complete payment to issue a receipt.</p>
          <p><Link href={`/events/${slug}/order/${order.reference}`}>Back to order</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <div className={styles.noprint}><ReceiptPrint /></div>
      <div className={styles.sheet}>
        <header className={styles.head}>
          <div className={styles.brand}>
            Afro<span>Lit</span>Playlist
            <small>AfroLitPlaylist · Lagos, Nigeria<br />hello@afrolitplaylist.com · afrolitplaylist.com</small>
          </div>
          <div className={styles.doc}>
            <h1>Receipt</h1>
            <div className={styles.paid}>Paid</div>
          </div>
        </header>

        <div className={styles.cols}>
          <div>
            <div className={styles.lbl}>Billed to</div>
            <div className={styles.val}><strong>{order.buyerName}</strong>{order.buyerEmail}</div>
          </div>
          <div>
            <div className={styles.lbl}>Receipt number</div>
            <div className={styles.val}><strong>{order.reference}</strong>Issued {fmtDay(issued, tz)}</div>
          </div>
          <div>
            <div className={styles.lbl}>Event</div>
            <div className={styles.val}>
              <strong>{order.event.title}</strong>
              {fmtDay(order.event.startsAt, tz)} · {formatTime(order.event.doorsAt ?? order.event.startsAt, tz)}
              {venue ? <><br />{venue}</> : null}
            </div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th className={styles.r}>Qty</th>
              <th className={styles.r}>Unit</th>
              <th className={styles.r}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.tier.name}
                  <span className={styles.sub}>
                    Admits {item.tier.admitsCount === 1 ? "one person" : `${item.tier.admitsCount} people`} per ticket
                  </span>
                </td>
                <td className={styles.r}>{item.quantity}</td>
                <td className={styles.r}>{formatKoboExact(item.unitKobo)}</td>
                <td className={styles.r}>{formatKoboExact(item.unitKobo * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.footRow}>
              <td colSpan={3} className={styles.r}>Subtotal</td>
              <td className={styles.r}>{formatKoboExact(order.items.reduce((n, i) => n + i.unitKobo * i.quantity, 0))}</td>
            </tr>
            <tr className={styles.footRow}>
              <td colSpan={3} className={styles.r}>Booking fee</td>
              <td className={styles.r}>{formatKoboExact(order.feesKobo ?? 0)}</td>
            </tr>
            <tr className={styles.total}>
              <td colSpan={3} className={styles.r}>Total paid</td>
              <td className={styles.r}>{formatKoboExact(order.totalKobo)}</td>
            </tr>
          </tfoot>
        </table>

        <div className={styles.pay}>
          <div>
            <div className={styles.lbl}>Payment method</div>
            <div className={styles.val}>Paystack</div>
          </div>
          <div>
            <div className={styles.lbl}>Processed by</div>
            <div className={styles.val}>Paystack</div>
          </div>
          <div>
            <div className={styles.lbl}>Paid on</div>
            <div className={styles.val}>{order.paidAt ? fmtPaid(order.paidAt, tz) : fmtDay(issued, tz)}</div>
          </div>
          <div>
            <div className={styles.lbl}>Reference</div>
            <div className={styles.val}>{order.reference}</div>
          </div>
        </div>

        <p className={styles.notice}>
          <strong>This is a receipt, not a ticket.</strong> It will not admit anyone.
          Your {ticketCount} ticket{ticketCount === 1 ? "" : "s"} with QR codes{" "}
          <Link href={`/events/${slug}/order/${order.reference}`}>are on your order page</Link>.
        </p>

        <footer className={styles.legal}>
          Keep this receipt for your records. For refunds and cancellations see
          afrolitplaylist.com/refunds. Questions: hello@afrolitplaylist.com
          <br />
          Generated {fmtDay(new Date(), tz)} · AfroLitPlaylist
        </footer>
      </div>
    </div>
  );
}
