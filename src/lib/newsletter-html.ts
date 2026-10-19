export function siteUrl() {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const usable = env && !/localhost|127\.0\.0\.1/i.test(env);
  if (usable) return env;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`.replace(/\/$/, "");
  if (env) return env;
  return "https://www.afrolitplaylist.com";
}

export const LOGO_PATH = "/brand/afrolit-logo.png";

export function logoAbsoluteUrl() {
  return `${siteUrl()}${LOGO_PATH}`;
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

export function logoMarkHtml(size = 40) {
  return `<img src="${esc(logoAbsoluteUrl())}" alt="" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:999px;object-fit:contain;background:#ffffff;border:0" />`;
}

/** Round mark + AFROLITPLAYLIST as one word (LIT in red). Use in every outbound mail. */
export const WORDMARK_HTML = `AFRO<span style="color:#E50914">LIT</span><span style="font-weight:400">PLAYLIST</span>`;

export function brandLockupHtml(opts?: { size?: number; href?: string; color?: string; fontSize?: number }) {
  const size = opts?.size ?? 40;
  const color = opts?.color ?? "#ffffff";
  const fontSize = opts?.fontSize ?? 18;
  const inner = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle">${logoMarkHtml(size)}</td>
<td valign="middle" style="padding-left:10px;font-family:Helvetica,Arial,sans-serif;font-size:${fontSize}px;font-weight:800;line-height:1;letter-spacing:-.02em;color:${color}">${WORDMARK_HTML}</td>
</tr></table>`;
  if (opts?.href) {
    return `<a href="${esc(opts.href)}" style="text-decoration:none;color:${color}">${inner}</a>`;
  }
  return inner;
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
