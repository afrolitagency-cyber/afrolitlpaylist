export function siteUrl() {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const usable = env && !/localhost|127\.0\.0\.1/i.test(env);
  if (usable) return env;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`.replace(/\/$/, "");
  if (env) return env;
  return "https://www.afrolitplaylist.com";
}

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

export function archiveSlugFromSubject(subject: string) {
  const base = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "issue";
  return `${base}-${Date.now().toString(36)}`;
}
