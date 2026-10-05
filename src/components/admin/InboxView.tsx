"use client";

import { useActionState, useState } from "react";
import { updateMessage } from "@/lib/actions/inbox";
import type { ActionState } from "@/lib/actions/_result";

export type Message = {
  id: string; name: string; email: string; subject: string; body: string;
  kind: string; status: string; createdAt: string;
};

const TONE: Record<string, string> = {
  NEW: "bg-(--primary)/15 text-(--primary)",
  OPEN: "bg-amber-500/15 text-amber-300",
  REPLIED: "bg-blue-500/15 text-blue-300",
  RESOLVED: "bg-emerald-500/15 text-emerald-400",
};

export function InboxView({ messages }: { messages: Message[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMessage, null);
  const [open, setOpen] = useState<Message | null>(messages[0] ?? null);

  return (
    <div className="grid gap-0 overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg) lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="border-b border-(--border-strong) lg:border-b-0 lg:border-r">
        {messages.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No messages.</p>
        ) : (
          messages.map((m) => (
            <button key={m.id} type="button" onClick={() => setOpen(m)}
              className={`block w-full border-b border-(--border-strong) p-4 text-left last:border-0 ${open?.id === m.id ? "bg-(--surface-alt)" : ""}`}>
              <div className="flex justify-between gap-2">
                <b className="truncate text-[13.5px]">{m.name}</b>
                <span className="shrink-0 text-[11.5px] text-(--sub-text)">{m.createdAt}</span>
              </div>
              <span className="text-[11px] capitalize text-(--primary)">{m.kind}</span>
              <p className="mt-1 truncate text-[13px]">{m.subject || m.body}</p>
            </button>
          ))
        )}
      </div>

      <div className="p-5">
        {!open ? (
          <p className="text-sm text-(--sub-text)">Select a message to read it.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-bold">{open.name}</h3>
              <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize ${TONE[open.status] ?? ""}`}>
                {open.status.toLowerCase()}
              </span>
            </div>
            <a href={`mailto:${open.email}`} className="text-xs text-(--sub-text) hover:text-(--primary)">{open.email}</a>

            {open.subject ? (
              <>
                <h4 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-(--sub-text)">Subject</h4>
                <p className="mt-1 text-base font-bold">{open.subject}</p>
              </>
            ) : null}

            <h4 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-(--sub-text)">Message</h4>
            <p className="mt-2 whitespace-pre-line rounded border border-(--border-strong) bg-(--surface-alt) p-4 text-sm leading-relaxed">
              {open.body}
            </p>

            {state ? (
              <p className={`mt-4 text-sm ${state.ok ? "text-emerald-400" : "text-(--primary)"}`}>
                {state.ok ? state.message : state.error}
              </p>
            ) : null}

            <form action={action} className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={open.id} />
              <div>
                <label htmlFor="status" className="mb-1.5 block text-xs font-bold">Status</label>
                <select id="status" name="status" defaultValue={open.status}
                  className="rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm">
                  {["NEW", "OPEN", "REPLIED", "RESOLVED"].map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2.5 text-sm">
                <input type="checkbox" name="assignToMe" className="size-4 accent-(--primary)" />
                Assign to me
              </label>
              <button type="submit" disabled={pending}
                className="rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {pending ? "Saving…" : "Update"}
              </button>
              <a href={`mailto:${open.email}?subject=Re: ${encodeURIComponent(open.subject || "Your message")}`}
                className="rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold">
                Reply by email
              </a>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
