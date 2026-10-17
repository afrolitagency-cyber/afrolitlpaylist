import { manageUrl, unsubscribeUrl, type NewsletterList } from "@/lib/newsletter-tokens";

export const MERGE = {
  firstName: "{{ALP_FIRST_NAME}}",
  manageUrl: "{{ALP_MANAGE_URL}}",
  unsubUrl: "{{ALP_UNSUB_URL}}",
} as const;

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function campaignHtml(body: unknown, html: string | null | undefined): string | null {
  if (html && html.trim()) return sanitizeCampaignHtml(html);
  if (typeof body === "string" && body.trim()) return sanitizeCampaignHtml(body);
  return null;
}

export function sanitizeCampaignHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=/gi, " ")
    .replace(/javascript:/gi, "");
}

export function plainTextFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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

export function archiveSlugFromSubject(subject: string) {
  const base = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "issue";
  return `${base}-${Date.now().toString(36)}`;
}
