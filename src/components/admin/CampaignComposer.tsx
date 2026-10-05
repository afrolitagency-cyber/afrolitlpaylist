"use client";

import { useActionState, useState } from "react";
import { saveCampaign, sendTestEmail } from "@/lib/actions/newsletter";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type CampaignValues = {
  id?: string;
  subject: string; previewText: string; fromName: string; fromEmail: string;
  body: string; audienceTag: string; scheduledAt: string; status: string;
};

export function CampaignComposer({ values, recipients }: { values: CampaignValues; recipients: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCampaign, null);
  const [testState, test, testing] = useActionState<ActionState, FormData>(sendTestEmail, null);
  const [body, setBody] = useState(values.body);
  const [subject, setSubject] = useState(values.subject);
  const locked = ["SENDING", "SENT"].includes(values.status);
  const msg = state ?? testState;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={action} className="space-y-5">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

        {msg ? (
          <p role={msg.ok ? "status" : "alert"}
            className={`rounded border p-3 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {msg.ok ? msg.message : msg.error}
          </p>
        ) : null}

        {locked ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            This campaign has been sent. Sent campaigns can&apos;t be edited — duplicate it instead.
          </p>
        ) : null}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4">
            <label className={label} htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)}
              disabled={locked} className={field} />
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="previewText">Preview text</label>
            <input id="previewText" name="previewText" defaultValue={values.previewText} disabled={locked} className={field} />
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

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="body">Email content</label>
          <textarea id="body" name="body" rows={14} value={body} onChange={(e) => setBody(e.target.value)}
            disabled={locked} className={field} placeholder="Write the issue. Basic HTML is allowed." />
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="audienceTag">Audience tag</label>
              <input id="audienceTag" name="audienceTag" defaultValue={values.audienceTag}
                placeholder="Leave blank for everyone" disabled={locked} className={field} />
            </div>
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
            Scheduling hands it to the cron — nothing sends from this page directly.
          </p>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-1 text-[15px] font-bold">Audience</h3>
          <p className="text-3xl font-black">{recipients.toLocaleString()}</p>
          <p className="text-xs text-(--sub-text)">confirmed subscribers</p>
        </div>

        <form action={test} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-3 text-[15px] font-bold">Test send</h3>
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="body" value={body} />
          <button type="submit" disabled={testing}
            className="w-full rounded border border-(--border-strong) py-2.5 text-sm font-bold disabled:opacity-60">
            {testing ? "Sending…" : "Send a test to myself"}
          </button>
        </form>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-3 text-[15px] font-bold">Preview</h3>
          <div className="rounded-lg bg-(--surface-alt) p-4">
            <p className="text-[10px] font-extrabold tracking-widest text-(--primary)">AFROLITPLAYLIST</p>
            <h4 className="mt-2 text-sm font-bold">{subject || "Subject line"}</h4>
            <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-xs text-(--sub-text)">
              {body || "Your content appears here."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
