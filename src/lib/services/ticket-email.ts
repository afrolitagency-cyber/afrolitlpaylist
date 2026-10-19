import { formatKobo } from "@/lib/money";
import { formatTime as formatEventTime } from "@/lib/events";
import { ticketQrPng } from "@/lib/ticket-qr";
import { sendRaw } from "@/lib/services/email";
import { brandLockupHtml } from "@/lib/newsletter-html";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://www.afrolitplaylist.com").replace(/\/$/, "");

export type TicketMailOrder = {
  reference: string;
  buyerName: string;
  buyerEmail: string;
  totalKobo: number;
  event: {
    slug: string;
    title: string;
    startsAt: Date;
    doorsAt: Date | null;
    timezone: string;
    venue: string | null;
    city: string | null;
    address: string | null;
    coverImage: string | null;
    ageLimit: string | null;
  };
  items: { quantity: number; unitKobo: number; tier: { name: string } }[];
  tickets: { code: string; holderName: string | null; tierId: string }[];
  itemsByTier: { id: string; name: string; admitsCount: number }[];
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDay(d: Date, tz: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function coverUrl(src: string | null) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE}${src.startsWith("/") ? src : `/${src}`}`;
}

function venueLine(event: TicketMailOrder["event"]) {
  return [event.venue, event.city].filter(Boolean).join(", ");
}

function placeLine(event: TicketMailOrder["event"]) {
  return [event.venue, event.address, event.city].filter(Boolean).join(", ") || venueLine(event);
}

function ageLine(event: TicketMailOrder["event"]) {
  return event.ageLimit ? `${event.ageLimit} · Bring a valid ID` : "Bring a valid ID";
}

function admitsLine(admits: number, event: TicketMailOrder["event"]) {
  const people = admits === 1 ? "Admits one" : `Admits ${admits}`;
  return event.ageLimit ? `${people} · ${event.ageLimit} · Bring a valid ID` : `${people} · Bring a valid ID`;
}

export async function sendTicketPurchaseEmail(order: TicketMailOrder): Promise<boolean> {
  const tz = order.event.timezone;
  const day = fmtDay(order.event.startsAt, tz);
  const doors = formatEventTime(order.event.doorsAt ?? order.event.startsAt, tz);
  const starts = formatEventTime(order.event.startsAt, tz);
  const venue = venueLine(order.event);
  const place = placeLine(order.event);
  const n = order.tickets.length;
  const orderUrl = `${SITE}/events/${order.event.slug}/order/${order.reference}`;
  const cover = coverUrl(order.event.coverImage);
  const shortRef = order.reference;

  const pngs = await Promise.all(order.tickets.map((t) => ticketQrPng(t.code)));

  const ticketRows = order.tickets.map((t, i) => {
    const tier = order.itemsByTier.find((x) => x.id === t.tierId);
    const name = esc(tier?.name ?? "Ticket");
    const who = esc(t.holderName || order.buyerName);
    const cid = `ticket-${i}`;
    return `
          <tr><td style="padding:0 24px 16px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:10px;">
              <tr><td style="padding:20px 22px 0 22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font:700 10px/1 Helvetica,Arial,sans-serif;color:#767676;letter-spacing:.14em;text-transform:uppercase;">Ticket ${i + 1} of ${n}</td>
                    <td align="right" style="font:700 10px/1 Helvetica,Arial,sans-serif;color:#767676;letter-spacing:.14em;text-transform:uppercase;">${esc(shortRef)}</td>
                  </tr>
                  <tr><td colspan="2" style="font:700 20px/1.25 Helvetica,Arial,sans-serif;color:#111111;padding:12px 0 2px 0;">${name}</td></tr>
                  <tr><td colspan="2" style="font:400 14px/1.4 Helvetica,Arial,sans-serif;color:#555555;padding:0 0 16px 0;">${who}</td></tr>
                </table>
              </td></tr>
              <tr><td align="center" style="padding:0 22px 6px 22px;">
                <img src="cid:${cid}" width="180" height="180" alt="QR code for ticket ${esc(t.code)}"
                     style="display:block;width:180px;height:180px;border:0;background:#ffffff;" />
              </td></tr>
              <tr><td align="center" style="padding:4px 22px 2px 22px;">
                <div style="font:700 17px/1.3 'Courier New',Courier,monospace;color:#111111;letter-spacing:.06em;">${esc(t.code)}</div>
                <div style="font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#777777;padding-top:4px;">Show this code if the QR will not scan</div>
              </td></tr>
              <tr><td style="padding:16px 22px 20px 22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6e6e6;">
                  <tr><td style="padding:12px 0 0 0;font:700 15px/1.35 Helvetica,Arial,sans-serif;color:#111111;">${esc(order.event.title)}</td></tr>
                  <tr><td style="font:400 13px/1.6 Helvetica,Arial,sans-serif;color:#555555;padding:3px 0 0 0;">
                    ${esc(day)} · Doors ${esc(doors)} · Starts ${esc(starts)}<br>
                    ${esc(place)}
                  </td></tr>
                  <tr><td style="font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#888888;padding:10px 0 0 0;">${esc(admitsLine(tier?.admitsCount ?? 1, order.event))}</td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>`;
  }).join("");

  const summaryRows = order.items.map((item) =>
    `<tr><td style="padding:4px 0;">${esc(item.tier.name)} × ${item.quantity}</td><td align="right" style="padding:4px 0;color:#ffffff;">${esc(formatKobo(item.unitKobo * item.quantity))}</td></tr>`,
  ).join("");

  const coverBlock = cover
    ? `<tr><td colspan="2" style="padding:0;font-size:0;line-height:0;">
              <img src="${esc(cover)}" width="552" height="220" alt="${esc(order.event.title)}"
                   style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:10px 10px 0 0;" />
            </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en" style="color-scheme:dark;supported-color-schemes:dark;">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Your tickets — ${esc(order.event.title)}</title></head>
<body style="margin:0;padding:0;background:#efefef;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${n} ticket${n === 1 ? "" : "s"} for ${esc(order.event.title)} — ${esc(day)}, doors ${esc(doors)} · starts ${esc(starts)}. Order ${esc(shortRef)}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#efefef" style="background:#efefef;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d0d0d"
             style="width:600px;max-width:600px;background:#0d0d0d;border-radius:14px;overflow:hidden;">
        <tr><td align="center" style="padding:28px 24px 6px 24px;">
          ${brandLockupHtml({ fontSize: 20 })}
        </td></tr>
        <tr><td align="center" style="padding:16px 24px 2px 24px;">
          <div style="font:700 11px/1 Helvetica,Arial,sans-serif;color:#9a9a9a;letter-spacing:.16em;text-transform:uppercase;">You're going</div>
        </td></tr>
        <tr><td align="center" style="padding:10px 24px 4px 24px;">
          <div style="font:800 30px/1.2 Helvetica,Arial,sans-serif;color:#ffffff;letter-spacing:-.02em;">${esc(order.event.title)}</div>
        </td></tr>
        <tr><td align="center" style="padding:6px 24px 22px 24px;">
          <div style="font:400 14px/1.5 Helvetica,Arial,sans-serif;color:#a8a8a8;">
            Order <span style="color:#ffffff;font-weight:700;">${esc(shortRef)}</span> &nbsp;·&nbsp; ${n} ticket${n === 1 ? "" : "s"}
          </div>
        </td></tr>
        <tr><td style="padding:0 24px 20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171717" style="background:#171717;border-radius:10px;">
            ${coverBlock}
            <tr>
              <td width="50%" style="padding:18px 18px 10px 18px;font:400 13px/1.55 Helvetica,Arial,sans-serif;color:#9a9a9a;">
                <span style="color:#6f6f6f;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;">Date</span><br>
                <span style="color:#ffffff;font-size:15px;font-weight:700;">${esc(day)}</span><br>Doors ${esc(doors)} · Starts ${esc(starts)}
              </td>
              <td width="50%" style="padding:18px 18px 10px 18px;font:400 13px/1.55 Helvetica,Arial,sans-serif;color:#9a9a9a;">
                <span style="color:#6f6f6f;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;">Venue</span><br>
                <span style="color:#ffffff;font-size:15px;font-weight:700;">${esc(order.event.venue || "Venue TBC")}</span><br>${esc([order.event.address, order.event.city].filter(Boolean).join(", ") || venue)}
              </td>
            </tr>
            <tr><td colspan="2" style="padding:0 18px 18px 18px;font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#7d7d7d;">${esc(ageLine(order.event))}</td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:0 24px 24px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td bgcolor="#e50914" style="background:#e50914;border-radius:7px;">
              <a href="${esc(orderUrl)}" style="display:inline-block;padding:14px 28px;font:700 15px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:7px;">View &amp; print your tickets</a>
            </td></tr>
          </table>
          <div style="font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#7d7d7d;padding-top:12px;">Keep this email. You can reopen your tickets from that link any time.</div>
        </td></tr>
        <tr><td style="padding:0 24px 18px 24px;"><div style="border-top:1px solid #262626;"></div></td></tr>
        <tr><td style="padding:0 24px 14px 24px;">
          <div style="font:700 11px/1 Helvetica,Arial,sans-serif;color:#9a9a9a;letter-spacing:.16em;text-transform:uppercase;">Your tickets</div>
        </td></tr>
        ${ticketRows}
        <tr><td style="padding:6px 24px 0 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171717" style="background:#171717;border-radius:10px;">
            <tr><td style="padding:18px 18px 8px 18px;font:700 11px/1 Helvetica,Arial,sans-serif;color:#9a9a9a;letter-spacing:.14em;text-transform:uppercase;">Order summary</td></tr>
            <tr><td style="padding:0 18px 4px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#cfcfcf;">
                ${summaryRows}
                <tr><td colspan="2" style="padding:8px 0 0 0;"><div style="border-top:1px solid #262626;"></div></td></tr>
                <tr><td style="padding:10px 0 18px 0;font-weight:700;color:#ffffff;">Total paid</td>
                    <td align="right" style="padding:10px 0 18px 0;font-weight:700;color:#ffffff;font-size:16px;">${esc(formatKobo(order.totalKobo))}</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 24px 0 24px;">
          <div style="font:700 11px/1 Helvetica,Arial,sans-serif;color:#9a9a9a;letter-spacing:.16em;text-transform:uppercase;padding-bottom:10px;">At the door</div>
          <div style="font:400 14px/1.75 Helvetica,Arial,sans-serif;color:#a8a8a8;">
            Have each QR code ready on your phone, or printed. Turn your screen brightness up —
            a dim screen often will not scan. Each code is scanned once, so if two people arrive
            with the same one, only the first gets in. Screenshots are fine. Bring ID.
          </div>
        </td></tr>
        <tr><td style="padding:24px;">
          <div style="border-top:1px solid #262626;padding-top:18px;font:400 12px/1.7 Helvetica,Arial,sans-serif;color:#6f6f6f;">
            Questions about this order? Reply to this email or write to
            <a href="mailto:hello@afrolitplaylist.com" style="color:#9a9a9a;">hello@afrolitplaylist.com</a>.<br>
            <a href="${esc(SITE)}/refunds" style="color:#9a9a9a;">Refund &amp; cancellation policy</a>
            &nbsp;·&nbsp;
            <a href="${esc(SITE)}" style="color:#9a9a9a;">afrolitplaylist.com</a><br><br>
            Sent because you bought tickets on AfroLitPlaylist. This is a receipt, not marketing.
          </div>
        </td></tr>
      </table>
      <div style="font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#9a9a9a;padding-top:14px;">AfroLitPlaylist · Lagos, Nigeria</div>
    </td></tr>
  </table>
</body></html>`;

  const textLines = [
    `YOUR TICKETS — ${order.event.title}`,
    "",
    `Order ${order.reference} · ${n} ticket${n === 1 ? "" : "s"}`,
    "",
    day,
    `Doors ${doors} · Starts ${starts}`,
    place,
    ageLine(order.event),
    "",
    "View and print your tickets:",
    orderUrl,
    "",
    ...order.tickets.flatMap((t, i) => {
      const tier = order.itemsByTier.find((x) => x.id === t.tierId);
      return [
        `TICKET ${i + 1} OF ${n} — ${tier?.name ?? "Ticket"} — ${t.holderName || order.buyerName}`,
        `  Code: ${t.code}`,
        "",
      ];
    }),
    "AT THE DOOR",
    "Show the QR code or read out the code above. Each one is scanned once,",
    "so if two people arrive with the same code only the first gets in.",
    "Screenshots are fine. Bring ID.",
    "",
    "Questions: hello@afrolitplaylist.com",
    `Refunds: ${SITE}/refunds`,
    "AfroLitPlaylist · Lagos, Nigeria",
  ];

  return sendRaw({
    to: order.buyerEmail,
    subject: `Your tickets — ${order.event.title}`,
    html,
    text: textLines.join("\n"),
    attachments: pngs.map((content, i) => ({
      filename: `ticket-${i + 1}.png`,
      content,
      contentId: `ticket-${i}`,
    })),
  });
}
