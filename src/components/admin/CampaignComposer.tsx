"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCampaign, sendTestEmail } from "@/lib/actions/newsletter";
import type { ActionState } from "@/lib/actions/_result";
import { renderBlogDigest, renderEventsDigest, type BlogItem, type EventItem } from "@/lib/newsletter-templates";
import type { CampaignKind } from "@prisma/client";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type CampaignValues = {
  id?: string;
  kind: CampaignKind;
  subject: string; previewText: string; fromName: string; fromEmail: string;
  body: string; audienceTag: string; scheduledAt: string; status: string;
  intro: string; heroTitle: string; kicker: string; issueLabel: string;
  featuredId: string; itemIds: string[];
  archiveSlug?: string | null;
};

export function CampaignComposer({
  values,
  recipients,
  blogCount,
  eventCount,
  posts,
  events,
}: {
  values: CampaignValues;
  recipients: number;
  blogCount: number;
  eventCount: number;
  posts: BlogItem[];
  events: EventItem[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCampaign, null);
  const [testState, test, testing] = useActionState<ActionState, FormData>(sendTestEmail, null);
  const [kind, setKind] = useState<CampaignKind>(values.kind);
  const [body, setBody] = useState(values.body);
  const [subject, setSubject] = useState(values.subject);
  const [previewText, setPreviewText] = useState(values.previewText);
  const [intro, setIntro] = useState(values.intro);
  const [heroTitle, setHeroTitle] = useState(values.heroTitle);
  const [kicker, setKicker] = useState(values.kicker);
  const [issueLabel, setIssueLabel] = useState(values.issueLabel);
  const [featuredId, setFeaturedId] = useState(values.featuredId);
  const [itemIds, setItemIds] = useState<string[]>(values.itemIds);
  const locked = ["SENDING", "SENT", "CANCELED"].includes(values.status);
  const msg = state ?? testState;
  const audience = kind === "BLOG_DIGEST" ? blogCount : kind === "EVENTS" ? eventCount : recipients;

  useEffect(() => {
    if (!values.id && state?.ok && state.id) {
      router.replace(`/admin/newsletter/${state.id}`);
    }
  }, [state, values.id, router]);
  const picks = kind === "EVENTS" ? events : posts;

  const previewHtml = useMemo(() => {
    if (kind === "CUSTOM") return body;
    const featured = picks.find((p) => p.id === featuredId);
    if (!featured) return "";
    const items = itemIds.map((id) => picks.find((p) => p.id === id)).filter(Boolean) as (BlogItem | EventItem)[];
    const common = {
      intro: intro || undefined,
      heroTitle: heroTitle || undefined,
      kicker: kicker || undefined,
      issueLabel: issueLabel || undefined,
      preheader: previewText || undefined,
      browserUrl: values.archiveSlug ? `/newsletter/issue/${values.archiveSlug}` : "#",
      socials: {},
      tagline: "Afrobeats, amapiano and everything that moves you.",
    };
    if (kind === "BLOG_DIGEST") {
      return renderBlogDigest({
        featured: featured as BlogItem,
        items: items as BlogItem[],
        ...common,
      }).html;
    }
    return renderEventsDigest({
      featured: featured as EventItem,
      items: items as EventItem[],
      ...common,
    }).html;
  }, [kind, body, picks, featuredId, itemIds, intro, heroTitle, kicker, issueLabel, previewText, values.archiveSlug]);

  function toggleItem(id: string) {
    setItemIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form action={action} className="space-y-5">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <input type="hidden" name="kind" value={kind} />

        {msg ? (
          <p role={msg.ok ? "status" : "alert"}
            className={`rounded border p-3 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {msg.ok ? msg.message : msg.error}
          </p>
        ) : null}

        {locked ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            This campaign has been sent. Sent campaigns can&apos;t be edited.
          </p>
        ) : null}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="kind">Email type</label>
          <select id="kind" disabled={locked} value={kind} onChange={(e) => {
            const next = e.target.value as CampaignKind;
            setKind(next);
            const pool = next === "EVENTS" ? events : next === "BLOG_DIGEST" ? posts : [];
            setFeaturedId(pool[0]?.id ?? "");
            setItemIds(pool.slice(1, 4).map((p) => p.id));
          }} className={field}>
            <option value="BLOG_DIGEST">Blog digest</option>
            <option value="EVENTS">Events</option>
            <option value="CUSTOM">Custom HTML</option>
          </select>
          <p className="mt-2 text-xs text-(--sub-text)">
            {kind === "CUSTOM" ? "Paste HTML for a one-off. Digests are the main path." : "Picks load from published posts or upcoming events. Saving freezes the HTML."}
          </p>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4">
            <label className={label} htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)}
              disabled={locked} className={field} />
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="previewText">Preview text</label>
            <input id="previewText" name="previewText" value={previewText} onChange={(e) => setPreviewText(e.target.value)} disabled={locked} className={field} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="fromName">From name</label>
              <input id="fromName" name="fromName" defaultValue={values.fromName || "AfroLitPlaylist"} disabled={locked} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="fromEmail">From email</label>
              <input id="fromEmail" name="fromEmail" type="email" defaultValue={values.fromEmail} disabled={locked} className={field} />
            </div>
          </div>
        </div>

        {kind !== "CUSTOM" ? (
          <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 space-y-4">
            <div>
              <label className={label} htmlFor="issueLabel">Issue label</label>
              <input id="issueLabel" name="issueLabel" value={issueLabel} onChange={(e) => setIssueLabel(e.target.value)}
                placeholder={kind === "EVENTS" ? "Events · Oct 2026" : "Blog digest · Oct 2026"} disabled={locked} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="kicker">Kicker</label>
              <input id="kicker" name="kicker" value={kicker} onChange={(e) => setKicker(e.target.value)} disabled={locked} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="heroTitle">Headline</label>
              <input id="heroTitle" name="heroTitle" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} disabled={locked} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="intro">Intro (after “Hey {`{{name}}`}”)</label>
              <textarea id="intro" name="intro" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} disabled={locked} className={field} />
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-(--sub-text)">Featured</p>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {picks.map((p) => (
                <label key={`f-${p.id}`} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="featuredId" value={p.id} checked={featuredId === p.id}
                    onChange={() => setFeaturedId(p.id)} disabled={locked} className="mt-1" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{p.title}</span>
                    <span className="text-xs text-(--sub-text)">{"dateLabel" in p ? p.dateLabel : p.dateLine}</span>
                  </span>
                </label>
              ))}
              {!picks.length ? <p className="text-sm text-(--sub-text)">Nothing published to pick from yet.</p> : null}
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-(--sub-text)">Also include</p>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {picks.filter((p) => p.id !== featuredId).map((p) => (
                <label key={`i-${p.id}`} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="checkbox" name="itemIds" value={p.id} checked={itemIds.includes(p.id)}
                    onChange={() => toggleItem(p.id)} disabled={locked} className="mt-1" />
                  <span>{p.title}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <label className={label} htmlFor="body">Raw HTML</label>
            <textarea id="body" name="body" rows={16} value={body} onChange={(e) => setBody(e.target.value)}
              disabled={locked} className={`${field} font-mono text-[13px]`} placeholder="Paste a finished HTML email. Scripts are stripped." />
          </div>
        )}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            {kind === "CUSTOM" ? (
              <div>
                <label className={label} htmlFor="audienceTag">Audience tag</label>
                <input id="audienceTag" name="audienceTag" defaultValue={values.audienceTag}
                  placeholder="Leave blank for everyone" disabled={locked} className={field} />
              </div>
            ) : null}
            <div>
              <label className={label} htmlFor="scheduledAt">Send at</label>
              <input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={values.scheduledAt}
                disabled={locked} className={field} />
            </div>
          </div>
          <label className="mb-4 flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="schedule" disabled={locked} className="size-4 accent-(--primary)" />
            Schedule this send
          </label>
          <button type="submit" disabled={pending || locked}
            className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Saving…" : "Save campaign"}
          </button>
          <p className="mt-2 text-xs text-(--sub-text)">
            Scheduling hands it to cron-job.org (every 15–20 min). Nothing sends from this page.
          </p>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-1 text-[15px] font-bold">Audience</h3>
          <p className="text-3xl font-black">{audience.toLocaleString()}</p>
          <p className="text-xs text-(--sub-text)">
            {kind === "BLOG_DIGEST" ? "confirmed · blog list" : kind === "EVENTS" ? "confirmed · events list" : "confirmed subscribers"}
          </p>
        </div>

        <form action={test} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-3 text-[15px] font-bold">Test send</h3>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="previewText" value={previewText} />
          <input type="hidden" name="body" value={body} />
          <input type="hidden" name="intro" value={intro} />
          <input type="hidden" name="heroTitle" value={heroTitle} />
          <input type="hidden" name="kicker" value={kicker} />
          <input type="hidden" name="issueLabel" value={issueLabel} />
          <input type="hidden" name="featuredId" value={featuredId} />
          {itemIds.map((id) => <input key={id} type="hidden" name="itemIds" value={id} />)}
          <button type="submit" disabled={testing}
            className="w-full rounded border border-(--border-strong) py-2.5 text-sm font-bold disabled:opacity-60">
            {testing ? "Sending…" : "Send a test to myself"}
          </button>
        </form>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-3 text-[15px] font-bold">Preview</h3>
          {previewHtml ? (
            <iframe title="Email preview" srcDoc={previewHtml}
              className="h-[640px] w-full rounded-lg border border-(--border) bg-black" />
          ) : (
            <p className="text-sm text-(--sub-text)">Pick a featured item or paste HTML to preview.</p>
          )}
          {values.archiveSlug && ["SCHEDULED", "SENDING", "SENT"].includes(values.status) ? (
            <a href={`/newsletter/issue/${values.archiveSlug}`} className="mt-3 inline-block text-xs underline" target="_blank" rel="noreferrer">
              View in browser
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
