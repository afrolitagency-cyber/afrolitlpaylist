import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { brandLockupHtml } from "@/lib/newsletter-html";

/**
 * All outbound mail goes through here. Sends never throw into a caller: a
 * failed notification must not roll back an approval that already happened.
 */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM ?? "AfroLitPlaylist <hello@afrolitplaylist.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com";

/** Display name + address from RESEND_FROM. Campaigns must use a domain verified on Resend. */
export function defaultFrom() {
  const m = FROM.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return { name: m[1]!.trim() || "AfroLitPlaylist", email: m[2]!.trim() };
  return { name: "AfroLitPlaylist", email: FROM.trim() };
}

type Mail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  attachments?: { filename: string; content: Buffer; contentId?: string }[];
};

type SendResult = { ok: boolean; id?: string; error?: string };

function payload(mail: Mail) {
  return {
    from: mail.from ?? FROM,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    ...(mail.text ? { text: mail.text } : {}),
    ...(mail.headers ? { headers: mail.headers } : {}),
    ...(mail.attachments?.length
      ? {
          attachments: mail.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentId: a.contentId,
            content_id: a.contentId,
          })),
        }
      : {}),
  };
}

async function send(mail: Mail): Promise<boolean> {
  return (await sendOne(mail)).ok;
}

async function sendOne(mail: Mail): Promise<SendResult> {
  if (!resend) {
    console.info(`[email:dev] → ${mail.to} · ${mail.subject}`);
    return { ok: false, error: "RESEND_API_KEY missing" };
  }
  try {
    const result = mail.idempotencyKey
      ? await resend.emails.send(payload(mail), { idempotencyKey: mail.idempotencyKey })
      : await resend.emails.send(payload(mail));
    if (result.error) {
      console.error("[email] send failed", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

/** Up to 100. If the batch is rejected, caller should retry one at a time. */
export async function sendCampaignBatch(mails: Mail[]): Promise<{
  ok: boolean;
  ids: (string | undefined)[];
  error?: string;
}> {
  if (!mails.length) return { ok: true, ids: [] };
  if (!resend) {
    for (const m of mails) console.info(`[email:dev] → ${m.to} · ${m.subject}`);
    return { ok: false, ids: [], error: "RESEND_API_KEY missing" };
  }
  if (mails.length === 1) {
    const r = await sendOne(mails[0]!);
    return { ok: r.ok, ids: [r.id], error: r.error };
  }
  const batch = (
    resend as {
      batch?: {
        send: (
          emails: ReturnType<typeof payload>[],
        ) => Promise<{ error?: { message: string } | null; data?: { id?: string }[] | { data?: { id?: string }[] } }>;
      };
    }
  ).batch;
  if (!batch?.send) {
    const ids: (string | undefined)[] = [];
    for (const m of mails) {
      const r = await sendOne(m);
      if (!r.ok) return { ok: false, ids, error: r.error };
      ids.push(r.id);
    }
    return { ok: true, ids };
  }
  try {
    const result = await batch.send(mails.map(payload));
    if (result.error) {
      console.error("[email] batch failed", result.error);
      return { ok: false, ids: [], error: result.error.message };
    }
    const ids = Array.isArray(result.data)
      ? result.data.map((d: { id?: string }) => d.id)
      : (result.data?.data as { id?: string }[] | undefined)?.map((d) => d.id) ?? [];
    return { ok: true, ids };
  } catch (err) {
    console.error("[email] batch failed", err);
    return { ok: false, ids: [], error: err instanceof Error ? err.message : "batch failed" };
  }
}

export async function sendCampaignEmail(mail: Mail): Promise<SendResult> {
  return sendOne(mail);
}

function layout(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#000;font-family:Helvetica,Arial,sans-serif;color:#fff">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#161616;border-radius:12px;padding:32px">
      <tr><td>
        <div style="margin:0 0 20px">${brandLockupHtml({ fontSize: 16 })}</div>
        <h1 style="margin:0 0 14px;font-size:22px">${title}</h1>
        <div style="font-size:15px;line-height:1.65;color:#b3b3b3">${body}</div>
        ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#E50914;color:#fff;padding:13px 24px;border-radius:4px;font-weight:600;text-decoration:none">${cta.label}</a>` : ""}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/**
 * Template resolution: admin-edited copy if a row exists, otherwise the built-in
 * default. A missing or broken template must never block a send, so every
 * lookup falls back rather than throwing.
 */
export type TemplateKey =
  | "event.registration"
  | "artist.invite"
  | "artist.changes"
  | "artist.approved"
  | "newsletter.confirm";

export const TEMPLATE_DEFAULTS: Record<TemplateKey, { name: string; subject: string; body: string }> = {
  "event.registration": {
    name: "Event registration confirmation",
    subject: "You're registered for {{event}}",
    body: "Hi {{name}},\n\nYou're on the list for **{{event}}**.\n\n{{date}}\n{{venue}}\n\nWe'll email you if anything changes.",
  },
  "artist.invite": {
    name: "Artist invite",
    subject: "Your AfroLitPlaylist artist invite",
    body: "Set a password to manage {{artist}} on AfroLitPlaylist.\n\nThis link works once and expires in 14 days.",
  },
  "artist.changes": {
    name: "Changes requested",
    subject: "Changes requested on your profile",
    body: "Your submission for {{artist}} needs a few edits before it can go live.\n\n{{note}}",
  },
  "artist.approved": {
    name: "Profile approved",
    subject: "Your profile is live",
    body: "{{artist}} is now published on AfroLitPlaylist.",
  },
  "newsletter.confirm": {
    name: "Newsletter confirmation",
    subject: "Confirm your subscription",
    body: "Confirm your email to get new music, event alerts and artist stories.",
  },
};

function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

export async function resolveTemplate(key: TemplateKey, vars: Record<string, string>) {
  let row: { subject: string; body: string } | null = null;
  try {
    row = await prisma.emailTemplate.findUnique({ where: { key }, select: { subject: true, body: true } });
  } catch {
    row = null; // a template lookup failure must not stop the email
  }
  const base = row ?? TEMPLATE_DEFAULTS[key];
  return {
    subject: fill(base.subject, vars),
    body: fill(base.body, vars)
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`)
      .join(""),
  };
}

export async function sendEventRegistration(
  to: string,
  vars: { name: string; event: string; date: string; venue: string; slug: string },
) {
  const { subject, body } = await resolveTemplate("event.registration", vars);
  return send({
    to,
    subject,
    html: layout("You're registered", body, { href: `${SITE}/events/${vars.slug}`, label: "View the event" }),
  });
}

const ROLE_INVITE: Record<string, string> = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  EDITOR: "editor",
  DOOR: "door staff",
  ARTIST: "artist",
};

export function sendAccountInvite(to: string, token: string, role: string) {
  const label = ROLE_INVITE[role] ?? "admin";
  return send({
    to,
    subject: `Your AfroLitPlaylist ${label} invite`,
    html: layout(
      "You've been invited",
      `<p>Set a password for your ${label} account on AfroLitPlaylist.</p>
       <p>This link works once and expires in 14 days.</p>`,
      { href: `${SITE}/portal/invite/${token}`, label: "Set your password" },
    ),
  });
}

export function sendArtistInvite(to: string, token: string, artistName?: string) {
  return send({
    to,
    subject: "Your AfroLitPlaylist artist invite",
    html: layout(
      "You've been invited",
      `<p>Set a password to manage ${artistName ? `<strong>${artistName}</strong>` : "your artist profile"} on AfroLitPlaylist.</p>
       <p>This link works once and expires in 14 days.</p>`,
      { href: `${SITE}/portal/invite/${token}`, label: "Set your password" },
    ),
  });
}

export function sendChangesRequested(to: string, artistName: string, note: string) {
  return send({
    to,
    subject: "Changes requested on your profile",
    html: layout(
      "An editor has asked for changes",
      `<p>Your submission for <strong>${artistName}</strong> needs a few edits before it can go live.</p>
       <blockquote style="border-left:3px solid #E50914;margin:18px 0;padding:4px 0 4px 16px;color:#fff">${note}</blockquote>
       <p>Make the changes and resubmit — this replaces your previous submission.</p>`,
      { href: `${SITE}/portal/profile`, label: "Edit your profile" },
    ),
  });
}

export function sendProfileApproved(to: string, artistName: string, slug: string) {
  return send({
    to,
    subject: "Your profile is live",
    html: layout(
      "You're live",
      `<p><strong>${artistName}</strong> is now published on AfroLitPlaylist.</p>`,
      { href: `${SITE}/artists/${slug}`, label: "View your page" },
    ),
  });
}

export function sendNewsletterConfirm(to: string, token: string) {
  return send({
    to,
    subject: "Confirm your subscription",
    html: layout(
      "One more step",
      `<p>Confirm your email to get new music, event alerts and artist stories.</p>
       <p style="font-size:13px">If you didn't sign up, ignore this — nothing happens without confirmation.</p>`,
      { href: `${SITE}/newsletter/confirm?token=${token}`, label: "Confirm subscription" },
    ),
  });
}

export function sendRaw(mail: Mail) {
  return send(mail);
}

export function sendCampaign(to: string, subject: string, html: string, unsubHref: string) {
  return send({
    to,
    subject,
    html: `${html}<p style="margin-top:28px;font-size:12px;color:#777;text-align:center">
      <a href="${unsubHref}" style="color:#777">Unsubscribe</a></p>`,
  });
}
