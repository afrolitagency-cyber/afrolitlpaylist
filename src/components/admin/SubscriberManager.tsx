"use client";

import { useActionState } from "react";
import {
  addSubscriber,
  importCsv,
  importInbox,
  importResendAudience,
  saveSubscriber,
} from "@/lib/actions/subscribers";
import type { ActionState } from "@/lib/actions/_result";

export type SubRow = {
  id: string;
  email: string;
  firstName: string;
  status: string;
  tags: string[];
  wantsBlog: boolean;
  wantsEvents: boolean;
};

const field = "rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export function SubscriberManager({ subscribers }: { subscribers: SubRow[] }) {
  const [addState, add, adding] = useActionState<ActionState, FormData>(addSubscriber, null);
  const [csvState, csv, csving] = useActionState<ActionState, FormData>(importCsv, null);
  const [inboxState, inbox, inboxing] = useActionState<ActionState, FormData>(importInbox, null);
  const [resendState, resend, resending] = useActionState<ActionState, FormData>(importResendAudience, null);
  const [saveState, save] = useActionState<ActionState, FormData>(saveSubscriber, null);
  const msg = addState ?? csvState ?? inboxState ?? resendState ?? saveState;

  return (
    <div className="space-y-5">
      {msg ? (
        <p role={msg.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {msg.ok ? msg.message : msg.error}
        </p>
      ) : null}

      <form action={add} className="grid gap-3 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="email">Add one email</label>
          <input id="email" name="email" type="email" required placeholder="name@gmail.com" className={`${field} w-full`} />
        </div>
        <div>
          <label className={label} htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" className={`${field} w-full`} />
        </div>
        <div>
          <label className={label} htmlFor="tags">Tags</label>
          <input id="tags" name="tags" placeholder="seed-test, lagos" className={`${field} w-full`} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirmed" defaultChecked className="size-4 accent-(--primary)" />
          Mark confirmed (I have consent)
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={adding}
            className="rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {adding ? "Saving…" : "Add subscriber"}
          </button>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={csv} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-1 text-[15px] font-bold">CSV / paste</h3>
          <p className="mb-3 text-xs text-(--sub-text)">
            Paste Google Contacts CSV or any list of emails. Gmail has no live sync — export from Contacts, then paste.
          </p>
          <textarea name="csv" rows={8} required placeholder={"email,first name\nalice@gmail.com,Alice"}
            className={`${field} w-full font-mono text-[13px]`} />
          <input name="tags" placeholder="Optional tags for this batch" className={`${field} mt-3 w-full`} />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirmed" defaultChecked className="size-4 accent-(--primary)" />
            Mark imported as confirmed
          </label>
          <button type="submit" disabled={csving}
            className="mt-3 rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {csving ? "Importing…" : "Import paste"}
          </button>
        </form>

        <div className="space-y-5">
          <form action={inbox} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <h3 className="mb-1 text-[15px] font-bold">Contact inbox</h3>
            <p className="mb-3 text-xs text-(--sub-text)">
              Copy unique emails from the contact form into this list. Unsubscribed people are left alone.
            </p>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmed" defaultChecked className="size-4 accent-(--primary)" />
              Mark as confirmed
            </label>
            <button type="submit" disabled={inboxing}
              className="rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold disabled:opacity-60">
              {inboxing ? "Importing…" : "Import inbox emails"}
            </button>
          </form>

          <form action={resend} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <h3 className="mb-1 text-[15px] font-bold">Resend audience</h3>
            <p className="mb-3 text-xs text-(--sub-text)">
              Resend dashboard → Audiences → copy the audience id. Uses the same API key as sending.
            </p>
            <input name="audienceId" required placeholder="aud_…" className={`${field} w-full`} />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmed" defaultChecked className="size-4 accent-(--primary)" />
              Mark as confirmed
            </label>
            <button type="submit" disabled={resending}
              className="mt-3 rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold disabled:opacity-60">
              {resending ? "Importing…" : "Import from Resend"}
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {subscribers.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No subscribers yet. Add the four test Gmails here, then pick them on a campaign.</p>
        ) : (
          subscribers.map((s) => (
            <form key={s.id} action={save} className="grid gap-3 border-b border-(--border-strong) px-5 py-3.5 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
              <input type="hidden" name="id" value={s.id} />
              <div className="min-w-0">
                <b className="block truncate text-sm">{s.email}</b>
                <span className="text-[11px] uppercase tracking-wide text-(--sub-text)">{s.status.toLowerCase()}</span>
                <input name="firstName" defaultValue={s.firstName} placeholder="First name" className={`${field} mt-2 w-full`} />
              </div>
              <div>
                <input name="tags" defaultValue={s.tags.join(", ")} placeholder="tags" className={`${field} w-full`} />
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="wantsBlog" defaultChecked={s.wantsBlog} /> Blog
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="wantsEvents" defaultChecked={s.wantsEvents} /> Events
                  </label>
                </div>
              </div>
              <button type="submit" className="self-center rounded border border-(--border-strong) px-3 py-2 text-xs font-bold">
                Save
              </button>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
