import { MERGE, esc, plainTextFromHtml, siteUrl } from "@/lib/newsletter-html";

export type CampaignContent = {
  featuredId?: string;
  itemIds?: string[];
  intro?: string;
  heroTitle?: string;
  kicker?: string;
  issueLabel?: string;
};

export type BlogItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string | null;
  author: string | null;
  dateLabel: string;
  readMins: number;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  venue: string | null;
  city: string | null;
  lineup: string;
  day: string;
  month: string;
  dateLine: string;
  ctaLabel: string;
  priceLabel: string | null;
  soldOut: boolean;
  registrationOpen: boolean;
  ticketed: boolean;
};

const CSS = `body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0;border-collapse:separate}
img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block}
body{margin:0;padding:0;width:100%!important;background:#070709}
a{color:#f6f5f2;text-decoration:none}
.ff{font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.fd{font-family:'Space Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif}
.card{background:#121215;border:1px solid #26262b;border-radius:22px}
.eb{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#9a9aa2}
.h1{font-size:32px;line-height:1.1;font-weight:700;letter-spacing:-.02em;color:#f6f5f2;margin:0}
.h2{font-size:26px;line-height:1.18;font-weight:700;letter-spacing:-.02em;color:#f6f5f2;margin:0}
.h3{font-size:18px;line-height:1.3;font-weight:700;color:#f6f5f2;margin:0}
.p{font-size:16px;line-height:1.6;color:#c9c9cf;margin:0}
.mut{font-size:13px;line-height:1.5;color:#9a9aa2}
.lnk{font-size:14px;font-weight:600;color:#f6f5f2!important;text-decoration:underline}
.btn{display:inline-block;background:#ff2d43;color:#0a0a0c!important;font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:600;font-size:16px;line-height:16px;padding:16px 30px;border-radius:99px;text-decoration:none}
.btn-o{background:transparent;border:1px solid #5a5a62;color:#f6f5f2!important;padding:14px 26px;font-size:15px;line-height:15px}
.pill{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:5px 11px;border-radius:99px;border:1px solid #f6f5f2;color:#f6f5f2}
@media only screen and (max-width:620px){
 .w{width:100%!important;max-width:100%!important}
 .gut{padding-left:12px!important;padding-right:12px!important}
 .padc{padding:20px!important}
 .fluid{width:100%!important;height:auto!important}
 .tm{width:84px!important;height:84px!important}
 .h1{font-size:28px!important}.h2{font-size:22px!important}
 .btn-m{display:block!important;text-align:center}
}`;

function monthYear(d = new Date()) {
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function parseContent(raw: unknown): CampaignContent {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const itemIds = Array.isArray(o.itemIds) ? o.itemIds.filter((id): id is string => typeof id === "string") : [];
  return {
    featuredId: typeof o.featuredId === "string" ? o.featuredId : undefined,
    itemIds,
    intro: typeof o.intro === "string" ? o.intro : undefined,
    heroTitle: typeof o.heroTitle === "string" ? o.heroTitle : undefined,
    kicker: typeof o.kicker === "string" ? o.kicker : undefined,
    issueLabel: typeof o.issueLabel === "string" ? o.issueLabel : undefined,
  };
}

function socialRow(socials: Record<string, string | undefined>) {
  const links = (
    [
      ["instagram", "Instagram"],
      ["x", "X"],
      ["youtube", "YouTube"],
      ["tiktok", "TikTok"],
    ] as const
  ).flatMap(([key, label]) => {
    const href = socials[key];
    if (!href) return [];
    return [`<a href="${esc(href)}" style="color:#c9c9cf">${label}</a>`];
  });
  return links.length ? `<div class="mut" style="margin-bottom:16px">${links.join(" &nbsp;·&nbsp; ")}</div>` : "";
}

function shell(opts: {
  title: string;
  preheader: string;
  issueLabel: string;
  browserUrl: string;
  inner: string;
  footerNote: string;
  unsubLabel: string;
  socials: Record<string, string | undefined>;
  tagline: string;
}) {
  const site = siteUrl();
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>${esc(opts.title)}</title>
<style>${CSS}</style>
</head>
<body class="ff" style="margin:0;padding:0;background:#070709">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${esc(opts.preheader)}&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070709"><tr><td align="center" style="padding:20px 0 40px">
<table role="presentation" class="w" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">
<tr><td class="gut mut ff" align="center" style="padding:0 24px 16px">Can’t see this email? <a href="${esc(opts.browserUrl)}" style="color:#9a9aa2;text-decoration:underline">View in browser</a></td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="fd" style="font-size:19px;font-weight:700;letter-spacing:-.02em;color:#f6f5f2"><a href="${esc(site)}" style="color:#f6f5f2">AfroLit Playlist</a></td><td align="right" class="mut ff">${esc(opts.issueLabel)}</td></tr></table></td></tr>
<tr><td height="28" style="font-size:0;line-height:0">&nbsp;</td></tr>
${opts.inner}
<tr><td height="30" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut ff" align="center" style="padding:0 24px"><div class="fd" style="font-size:16px;font-weight:700;color:#f6f5f2">AfroLit Playlist</div>
<div class="mut" style="margin:6px 0 14px">${esc(opts.tagline)}</div>
${socialRow(opts.socials)}
<div class="mut" style="font-size:12px;color:#8a8a92">${opts.footerNote}<br>
<a href="${MERGE.unsubUrl}" style="color:#9a9aa2;text-decoration:underline">${esc(opts.unsubLabel)}</a>
 &nbsp;·&nbsp; <a href="${MERGE.manageUrl}" style="color:#9a9aa2;text-decoration:underline">Email preferences</a><br><br>AfroLit Playlist · Lagos, Nigeria</div></td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

export function renderBlogDigest(opts: {
  featured: BlogItem;
  items: BlogItem[];
  intro?: string;
  heroTitle?: string;
  kicker?: string;
  issueLabel?: string;
  preheader?: string;
  browserUrl: string;
  socials: Record<string, string | undefined>;
  tagline: string;
}) {
  const site = siteUrl();
  const featuredHref = `${site}/blog/${opts.featured.slug}`;
  const kicker = opts.kicker || "New on the blog";
  const heroTitle = opts.heroTitle || "The best of our last two weeks";
  const intro = opts.intro?.trim()
    || "one big story and a few more from the last fortnight, picked by the editors.";
  const issueLabel = opts.issueLabel || `Blog digest · ${monthYear()}`;
  const cover = opts.featured.coverImage
    ? `<tr><td style="padding:0"><a href="${esc(featuredHref)}"><img src="${esc(opts.featured.coverImage)}" width="552" height="220" alt="${esc(opts.featured.title)}" class="fluid" style="width:100%;max-width:552px;height:auto;border-radius:21px 21px 0 0"></a></td></tr>`
    : "";
  const cat = [opts.featured.category, `${opts.featured.readMins} min read`].filter(Boolean).join(" · ");
  const rows = opts.items.map((p, i) => {
    const href = `${site}/blog/${p.slug}`;
    const img = p.coverImage
      ? `<td width="96" valign="top"><a href="${esc(href)}"><img src="${esc(p.coverImage)}" width="96" height="96" class="tm" alt="${esc(p.title)}" style="border-radius:14px"></a></td>`
      : "";
    const k = [p.category, `${p.readMins} min`].filter(Boolean).join(" · ");
    return `<tr><td style="padding:18px 24px;${i ? "border-top:1px solid #26262b;" : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${img}
<td valign="top" style="${p.coverImage ? "padding-left:16px" : ""}"><div class="eb" style="font-size:11px">${esc(k)}</div>
<h3 class="h3 fd" style="margin-top:6px"><a href="${esc(href)}" style="color:#f6f5f2">${esc(p.title)}</a></h3>
<div class="mut ff" style="margin-top:6px">By ${esc(p.author ?? "the AfroLit team")} · ${esc(p.dateLabel)}</div></td></tr></table></td></tr>`;
  }).join("");

  const inner = `
<tr><td class="gut" style="padding:0 24px"><div class="eb">${esc(kicker)}</div><h1 class="h1 fd" style="margin-top:12px">${esc(heroTitle)}</h1><p class="p ff" style="margin-top:12px">Hey ${MERGE.firstName}, ${esc(intro)}</p></td></tr>
<tr><td height="26" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="#121215">${cover}
<tr><td class="padc" style="padding:24px 28px 30px"><div class="eb">${esc(cat)}</div>
<h2 class="h2 fd" style="margin:12px 0 10px"><a href="${esc(featuredHref)}" style="color:#f6f5f2">${esc(opts.featured.title)}</a></h2>
${opts.featured.excerpt ? `<p class="p ff">${esc(opts.featured.excerpt)}</p>` : ""}
<div style="height:22px;line-height:22px;font-size:0">&nbsp;</div><a class="btn btn-m" href="${esc(featuredHref)}" style="background:#ff2d43;color:#0a0a0c">Read the story</a></td></tr></table></td></tr>
${opts.items.length ? `<tr><td height="24" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="#121215"><tr><td style="padding:24px 24px 6px"><div class="h2 fd" style="font-size:22px">Also new this fortnight</div></td></tr>
${rows}
<tr><td height="10" style="font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>` : ""}
<tr><td height="24" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="#121215"><tr><td class="padc" align="center" style="padding:32px 28px"><div class="h2 fd" style="font-size:22px">There’s more where that came from</div><p class="p ff" style="margin:10px 0 22px">New reviews, interviews and playlists land every week.</p><a class="btn btn-o btn-m" href="${esc(site)}/blog" style="border:1px solid #5a5a62;color:#f6f5f2;background:transparent">Browse all posts</a></td></tr></table></td></tr>`;

  const html = shell({
    title: opts.featured.title,
    preheader: opts.preheader || opts.featured.excerpt || heroTitle,
    issueLabel,
    browserUrl: opts.browserUrl,
    inner,
    footerNote: "You’re getting this because you subscribed to blog updates on afrolitplaylist.com.",
    unsubLabel: "Unsubscribe from blog updates",
    socials: opts.socials,
    tagline: opts.tagline,
  });
  return { html, text: plainTextFromHtml(html) };
}

export function renderEventsDigest(opts: {
  featured: EventItem;
  items: EventItem[];
  intro?: string;
  heroTitle?: string;
  kicker?: string;
  issueLabel?: string;
  preheader?: string;
  browserUrl: string;
  socials: Record<string, string | undefined>;
  tagline: string;
}) {
  const site = siteUrl();
  const href = `${site}/events/${opts.featured.slug}`;
  const kicker = opts.kicker || "Anticipated events";
  const heroTitle = opts.heroTitle || "Shows worth planning for";
  const intro = opts.intro?.trim() || "here are shows worth putting in the diary.";
  const issueLabel = opts.issueLabel || `Events · ${monthYear()}`;
  const cover = opts.featured.coverImage
    ? `<tr><td style="padding:0"><a href="${esc(href)}"><img src="${esc(opts.featured.coverImage)}" width="552" height="200" alt="${esc(opts.featured.title)}" class="fluid" style="width:100%;max-width:552px;height:auto;border-radius:21px 21px 0 0"></a></td></tr>`
    : "";
  const pill = opts.featured.soldOut ? `<span class="pill">Sold out</span>` : "";
  const featuredCta = opts.featured.soldOut ? "Join the waitlist" : opts.featured.ticketed ? "Get tickets" : "Register";
  const priceCell = opts.featured.priceLabel
    ? `<td style="padding-left:18px" class="mut ff">From<br><span class="fd" style="font-size:20px;font-weight:700;color:#f6f5f2">${esc(opts.featured.priceLabel)}</span></td>`
    : "";

  const rows = opts.items.map((e, i) => {
    const eh = `${site}/events/${e.slug}`;
    const where = [e.dateLine.split(" · ")[0], e.city].filter(Boolean).join(" · ");
    return `<tr><td style="padding:18px 24px;${i ? "border-top:1px solid #26262b;" : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="64" valign="top"><table role="presentation" width="64" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f5f2" style="border-radius:14px"><tr><td align="center" style="padding:10px 0 9px"><div class="fd" style="font-size:24px;font-weight:700;color:#0a0a0c;line-height:1">${esc(e.day)}</div><div class="ff" style="font-size:11px;letter-spacing:.14em;font-weight:600;color:#0a0a0c;margin-top:4px">${esc(e.month)}</div></td></tr></table></td>
<td valign="top" style="padding-left:16px"><div class="mut ff">${esc(where)}</div>
<h3 class="h3 fd" style="margin-top:4px"><a href="${esc(eh)}" style="color:#f6f5f2">${esc(e.title)}</a></h3>
<div class="mut ff" style="margin-top:4px">${esc([e.lineup, e.venue].filter(Boolean).join(" · "))}</div>
<div style="margin-top:10px"><a class="lnk" href="${esc(eh)}" style="color:#f6f5f2;text-decoration:underline">${esc(e.ctaLabel)} →</a></div></td></tr></table></td></tr>`;
  }).join("");

  const inner = `
<tr><td class="gut" style="padding:0 24px"><div class="eb">${esc(kicker)}</div><h1 class="h1 fd" style="margin-top:12px">${esc(heroTitle)}</h1><p class="p ff" style="margin-top:12px">Hey ${MERGE.firstName}, ${esc(intro)}</p></td></tr>
<tr><td height="26" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="#121215">${cover}
<tr><td class="padc" style="padding:24px 28px 30px">${pill}
<div class="eb" style="margin-top:${pill ? "16px" : "0"};color:#f6f5f2">${esc(opts.featured.dateLine)}</div>
<h2 class="h2 fd" style="margin:8px 0 8px"><a href="${esc(href)}" style="color:#f6f5f2">${esc(opts.featured.title)}</a></h2>
<p class="p ff">${esc([opts.featured.venue, opts.featured.city].filter(Boolean).join(", "))}<br><span style="color:#9a9aa2">${esc(opts.featured.lineup)}</span></p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr>
<td><a class="btn btn-m" href="${esc(href)}" style="background:#ff2d43;color:#0a0a0c">${esc(featuredCta)}</a></td>
${priceCell}</tr></table></td></tr></table></td></tr>
${opts.items.length ? `<tr><td height="24" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="#121215"><tr><td style="padding:24px 24px 6px"><div class="h2 fd" style="font-size:22px">Also coming up</div></td></tr>
${rows}
<tr><td height="10" style="font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>` : ""}
<tr><td height="24" style="font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="gut" style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="#121215"><tr><td class="padc" align="center" style="padding:32px 28px"><div class="h2 fd" style="font-size:22px">Never miss an announcement</div><p class="p ff" style="margin:10px 0 22px">We add new events every week, from club nights to festivals.</p><a class="btn btn-o btn-m" href="${esc(site)}/events" style="border:1px solid #5a5a62;color:#f6f5f2;background:transparent">Browse all events</a></td></tr></table></td></tr>`;

  const html = shell({
    title: opts.featured.title,
    preheader: opts.preheader || `${opts.featured.title} — ${opts.featured.dateLine}`,
    issueLabel,
    browserUrl: opts.browserUrl,
    inner,
    footerNote: "You’re getting this because you subscribed to event updates on afrolitplaylist.com.",
    unsubLabel: "Unsubscribe from event updates",
    socials: opts.socials,
    tagline: opts.tagline,
  });
  return { html, text: plainTextFromHtml(html) };
}

