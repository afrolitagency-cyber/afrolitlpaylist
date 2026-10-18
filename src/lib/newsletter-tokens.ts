import crypto from "node:crypto";
import { MERGE, esc, siteUrl } from "@/lib/newsletter-html";

export { siteUrl };

const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;

export type NewsletterList = "blog" | "events" | "all";

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function newConfirmToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
  };
}

function manageSecret() {
  const secret = process.env.NEWSLETTER_SECRET;
  if (!secret) return null;
  return secret;
}

/** Derive (do not store) the manage/unsubscribe token. */
export function manageToken(subscriberId: string) {
  const secret = manageSecret();
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`manage:${subscriberId}`).digest("base64url");
}

export function verifyManageToken(subscriberId: string, token: string) {
  const expected = manageToken(subscriberId);
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function manageUrl(subscriberId: string) {
  const t = manageToken(subscriberId);
  if (!t) return `${siteUrl()}/newsletter/preferences`;
  return `${siteUrl()}/newsletter/preferences?s=${encodeURIComponent(subscriberId)}&t=${encodeURIComponent(t)}`;
}

export function unsubscribeUrl(subscriberId: string, list: NewsletterList = "all") {
  const t = manageToken(subscriberId);
  const q = new URLSearchParams({ s: subscriberId, t: t ?? "" });
  if (list !== "all") q.set("list", list);
  return `${siteUrl()}/newsletter/unsubscribe?${q.toString()}`;
}

export function unsubscribePostUrl(subscriberId: string, list: NewsletterList = "all") {
  const t = manageToken(subscriberId);
  const q = new URLSearchParams({ s: subscriberId, t: t ?? "" });
  if (list !== "all") q.set("list", list);
  return `${siteUrl()}/api/newsletter/unsubscribe?${q.toString()}`;
}

export function parseList(raw: string | null | undefined): NewsletterList {
  if (raw === "blog" || raw === "events") return raw;
  return "all";
}

function greetingName(firstName: string | null | undefined) {
  const n = firstName?.trim();
  return n ? esc(n) : "there";
}

export function applyMerge(
  html: string,
  opts: {
    firstName?: string | null;
    subscriberId: string;
    list?: NewsletterList;
  },
) {
  const manage = manageUrl(opts.subscriberId);
  const unsub = unsubscribeUrl(opts.subscriberId, opts.list ?? "all");
  const first = greetingName(opts.firstName);
  let out = html
    .replaceAll(MERGE.firstName, first)
    .replaceAll(MERGE.manageUrl, manage)
    .replaceAll(MERGE.unsubUrl, unsub);
  if (!html.includes(MERGE.unsubUrl)) {
    out += `<p style="margin-top:28px;font-size:12px;color:#777;text-align:center">
      <a href="${unsub}" style="color:#777">Unsubscribe</a>
      &nbsp;·&nbsp;
      <a href="${manage}" style="color:#777">Email preferences</a>
    </p>`;
  }
  return out;
}

export function applyMergeText(
  text: string,
  opts: { firstName?: string | null; subscriberId: string; list?: NewsletterList },
) {
  const manage = manageUrl(opts.subscriberId);
  const unsub = unsubscribeUrl(opts.subscriberId, opts.list ?? "all");
  const first = opts.firstName?.trim() || "there";
  let out = text
    .replaceAll(MERGE.firstName, first)
    .replaceAll(MERGE.manageUrl, manage)
    .replaceAll(MERGE.unsubUrl, unsub);
  if (!text.includes(MERGE.unsubUrl)) {
    out += `\n\nUnsubscribe: ${unsub}\nPreferences: ${manage}`;
  }
  return out;
}
