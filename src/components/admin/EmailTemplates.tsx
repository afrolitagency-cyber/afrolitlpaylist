"use client";

import { useActionState, useState } from "react";
import { saveEmailTemplate, resetEmailTemplate } from "@/lib/actions/taxonomy";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";

export type TemplateRow = {
  key: string; name: string; subject: string; body: string; customised: boolean; placeholders: string[];
};

export function EmailTemplates({ templates }: { templates: TemplateRow[] }) {
  const [state, save, saving] = useActionState<ActionState, FormData>(saveEmailTemplate, null);
  const [, reset] = useActionState<ActionState, FormData>(resetEmailTemplate, null);
  const [open, setOpen] = useState(templates[0]?.key ?? "");

  const active = templates.find((t) => t.key === open) ?? templates[0];
  if (!active) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {templates.map((t) => (
          <button key={t.key} type="button" onClick={() => setOpen(t.key)}
            className={`block w-full border-b border-(--border-strong) p-4 text-left last:border-0 ${open === t.key ? "bg-(--surface-alt)" : ""}`}>
            <b className="block text-[13.5px]">{t.name}</b>
            <span className="text-xs text-(--sub-text)">{t.customised ? "Edited" : "Built-in"}</span>
          </button>
        ))}
      </nav>

      <form key={active.key} action={save} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <input type="hidden" name="key" value={active.key} />

        {state ? (
          <p role={state.ok ? "status" : "alert"}
            className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {state.ok ? state.message : state.error}
          </p>
        ) : null}

        <h2 className="mb-4 text-[15px] font-bold">{active.name}</h2>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold" htmlFor="subject">Subject</label>
          <input id="subject" name="subject" defaultValue={active.subject} className={field} />
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold" htmlFor="body">Body</label>
          <textarea id="body" name="body" rows={10} defaultValue={active.body} className={field} />
          <p className="mt-2 text-xs text-(--sub-text)">
            Blank lines start a new paragraph. **text** renders bold. Available placeholders:{" "}
            {active.placeholders.map((p) => (
              <code key={p} className="mr-1.5 rounded bg-(--surface-alt) px-1.5 py-0.5">{`{{${p}}}`}</code>
            ))}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving}
            className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save template"}
          </button>
          {active.customised ? (
            <button type="submit" formAction={reset}
              className="rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold">
              Revert to built-in
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
