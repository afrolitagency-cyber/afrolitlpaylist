import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { fulfillPaidOrder } from "@/lib/orders";
import { formatKobo } from "@/lib/money";
import { formatTime } from "@/lib/events";
import { ticketQrSrc } from "@/lib/ticket-qr";
import { OrderArrival } from "@/components/public/order/OrderArrival";
import { OrderActions } from "@/components/public/order/OrderActions";
import styles from "@/components/public/order/order.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Your tickets" };
}

function fmtDay(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function fmtYear(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric" }).format(d);
  } catch {
    return String(d.getUTCFullYear());
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
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function icsUtc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export default async function OrderPage({
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
          slug: true,
          title: true,
          startsAt: true,
          doorsAt: true,
          timezone: true,
          venue: true,
          city: true,
          address: true,
          coverImage: true,
        },
      },
      items: { include: { tier: { select: { name: true, admitsCount: true } } } },
      tickets: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.event.slug !== slug) notFound();

  let status = order.status;
  let tickets = order.tickets;
  if (status === "PENDING") {
    const settled = await fulfillPaidOrder(reference);
    if (settled.ok) {
      status = settled.order.status;
      tickets = settled.order.tickets ?? tickets;
    }
  }

  const tz = order.event.timezone;
  const venue = [order.event.venue, order.event.city].filter(Boolean).join(", ");
  const place = [order.event.venue, order.event.address, order.event.city].filter(Boolean).join(", ") || venue;
  const whenShort = `${fmtDay(order.event.startsAt, tz)} ${fmtYear(order.event.startsAt, tz)}`;
  const doors = formatTime(order.event.doorsAt ?? order.event.startsAt, tz);
  const stubWhen = `${fmtDay(order.event.startsAt, tz)} ${fmtYear(order.event.startsAt, tz)} · Doors ${doors}${venue ? ` · ${venue}` : ""}`;

  const names = [...new Set(order.items.map((i) => i.tier.name))];
  const ticketCount = tickets.length || order.items.reduce((n, i) => n + i.quantity, 0);
  const typeLabel = names.length === 1 ? names[0] : names.length ? "Mixed" : "Tickets";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AfroLitPlaylist//Tickets//EN",
    "BEGIN:VEVENT",
    `UID:${order.reference}@afrolitplaylist.com`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(order.event.startsAt)}`,
    `SUMMARY:${icsEscape(order.event.title)}`,
    place ? `LOCATION:${icsEscape(place)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const qrs = await Promise.all(tickets.map((t) => ticketQrSrc(t.code)));

  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <OrderArrival paid={status === "PAID"} ticketCount={ticketCount} email={order.buyerEmail} />
      </Suspense>

      <section className={styles.hero}>
        {order.event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.heroImg} src={order.event.coverImage} alt="" />
        ) : null}
        <div className={styles.heroIn}>
          <svg className={styles.thumb} viewBox="0 0 64 64" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 6.5 10.5 11M20 3l.6 5M31.5 7 29 11.5" />
            <path d="M23 28.5v24a3.5 3.5 0 0 0 3.5 3.5h19.2a5 5 0 0 0 4.9-4l3.6-18a5 5 0 0 0-4.9-6H40l1.6-7.9a5.5 5.5 0 0 0-5.4-6.6h-.4a2.5 2.5 0 0 0-2.3 1.5l-6.4 14a5 5 0 0 1-2.6 2.6z" />
            <rect x="10" y="27" width="13" height="29" rx="3" />
          </svg>
          <div className={styles.booked}>{status === "PAID" ? "Tickets booked" : status === "PENDING" ? "Waiting for payment" : `Order ${status.toLowerCase()}`}</div>
          <h1>{order.event.title}</h1>
          {place ? (
            <p className={styles.place}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></svg>
              {place}
            </p>
          ) : null}
        </div>
      </section>

      <section className={styles.facts}>
        <div>
          <div className={styles.lbl}>Date</div>
          <div className={styles.val}>{fmtDay(order.event.startsAt, tz)}<small>{fmtYear(order.event.startsAt, tz)}</small></div>
        </div>
        <div>
          <div className={styles.lbl}>Time</div>
          <div className={styles.val}>{doors}<small>Doors open</small></div>
        </div>
        <div>
          <div className={styles.lbl}>Ticket type</div>
          <div className={styles.val}>{typeLabel}<small>{ticketCount} ticket{ticketCount === 1 ? "" : "s"}</small></div>
        </div>
        <div>
          <div className={styles.lbl}>Order</div>
          <div className={`${styles.val} ${styles.ref}`}>{order.reference}</div>
        </div>
      </section>

      {status === "PAID" ? (
        <>
          <OrderActions ics={ics} fileSlug={order.event.slug} receiptHref={`/events/${slug}/order/${order.reference}/receipt`} />

          <div className={styles.sec}>
            <h2>Your tickets</h2>
            <span className={styles.mailed}>Emailed to {order.buyerEmail}</span>
          </div>

          <div className={styles.stubs}>
            {tickets.map((t, i) => {
              const item = order.items.find((row) => row.tierId === t.tierId);
              const admits = item?.tier.admitsCount ?? 1;
              return (
                <article key={t.id} className={styles.stub}>
                  <div className={styles.stubHead}>
                    <div>
                      <span className={styles.eyebrow}>Ticket {i + 1} of {tickets.length}</span>
                      <h3>{item?.tier.name ?? "Ticket"}</h3>
                      <p className={styles.who}>{t.holderName ?? order.buyerName}</p>
                    </div>
                    <span className={styles.pill}>Admits {admits}</span>
                  </div>
                  <div className={styles.tear}><span /></div>
                  <div className={styles.stubQr}>
                    <p className={styles.showAt}>Show this QR code at the entrance</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrs[i]} width={172} height={172} alt={`QR code for ticket ${t.code}`} />
                    <code>{t.code}</code>
                    <span className={styles.hint}>Read this out if the QR will not scan</span>
                  </div>
                  <div className={styles.stubFoot}>
                    <strong>{order.event.title}</strong>
                    <span>{stubWhen}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.note}>
            <b>At the door.</b> Show each QR code, or read out the code beneath it. Turn your
            screen brightness up — a dim screen often will not scan. Each code is scanned
            once, so if two people arrive with the same one only the first gets in. Bring ID.
          </div>

          <div className={styles.sec} id="receipt"><h2>Receipt</h2></div>
          <div className={styles.panel}>
            <table className={styles.table}>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.tier.name} × {item.quantity}
                      <span className={styles.unit}>{formatKobo(item.unitKobo)} each</span>
                    </td>
                    <td className={styles.right}>{formatKobo(item.unitKobo * item.quantity)}</td>
                  </tr>
                ))}
                <tr><td colSpan={2}><div className={styles.rule} /></td></tr>
                <tr>
                  <td>Booking fee</td>
                  <td className={styles.right}>{formatKobo(order.feesKobo ?? 0)}</td>
                </tr>
                <tr><td colSpan={2}><div className={styles.rule} /></td></tr>
                <tr className={styles.total}>
                  <td>Total paid</td>
                  <td className={styles.right}>{formatKobo(order.totalKobo)}</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.paidWith}>
              <span>Paystack</span>
              <span>{order.paidAt ? fmtPaid(order.paidAt, tz) : whenShort}</span>
            </div>
          </div>
        </>
      ) : status === "PENDING" ? (
        <div className={styles.wait}>
          <h2>Waiting for payment</h2>
          <p>
            If you already paid, wait a moment and refresh. Tickets are issued when Paystack confirms the charge.
            This page also checks Paystack once on load.
          </p>
        </div>
      ) : (
        <div className={styles.wait}>
          <h2>This order is {status.toLowerCase()}</h2>
          <p>If you still want tickets, start checkout again.</p>
        </div>
      )}

      <footer className={styles.foot}>
        Questions about this order? <a href="mailto:hello@afrolitplaylist.com">hello@afrolitplaylist.com</a>
        <br />
        AfroLit Playlist · Lagos, Nigeria
      </footer>
    </div>
  );
}
