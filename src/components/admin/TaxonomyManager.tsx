"use client";

import { useActionState, useState } from "react";
import { saveCategory, deleteCategory, saveCollection, deleteCollection } from "@/lib/actions/taxonomy";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
export type Term = { id: string; name: string; slug: string; count: number };

function Section({
  title, hint, terms, countLabel,
  saveAction, deleteAction,
}: {
  title: string; hint: string; terms: Term[]; countLabel: string;
  saveAction: typeof saveCategory; deleteAction: typeof deleteCategory;
}) {
  const [state, save, saving] = useActionState<ActionState, FormData>(saveAction, null);
  const [, remove] = useActionState<ActionState, FormData>(deleteAction, null);
  const [editing, setEditing] = useState<Term | null>(null);

  return (
    <section className="rounded-xl border border-(--border-strong) bg-(--card-bg)">
      <div className="border-b border-(--border-strong) p-5">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <p className="mt-1 text-sm text-(--sub-text)">{hint}</p>
      </div>

      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mx-5 mt-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      <div className="p-5">
        {terms.length === 0 ? (
          <p className="mb-4 text-sm text-(--sub-text)">None yet.</p>
        ) : (
          <div className="mb-5 divide-y divide-(--border-strong)">
            {terms.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{t.name}</b>
                  <span className="text-xs text-(--sub-text)">/{t.slug} · {t.count} {countLabel}</span>
                </div>
                <button type="button" onClick={() => setEditing(t)}
                  className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold">Edit</button>
                <form action={remove}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="rounded border border-(--primary)/40 px-3 py-1.5 text-xs font-bold text-(--primary)">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={save} className="flex flex-wrap items-end gap-3">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="min-w-44 flex-1">
            <label className="mb-1.5 block text-xs font-bold">Name</label>
            <input name="name" required defaultValue={editing?.name ?? ""} className={field} />
          </div>
          <div className="min-w-44 flex-1">
            <label className="mb-1.5 block text-xs font-bold">Slug</label>
            <input name="slug" defaultValue={editing?.slug ?? ""} placeholder="auto from name" className={field} />
          </div>
          <button type="submit" disabled={saving}
            className="rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : editing ? "Update" : "Add"}
          </button>
          {editing ? (
            <button type="button" onClick={() => setEditing(null)}
              className="rounded border border-(--border-strong) px-4 py-3 text-sm font-bold">Cancel</button>
          ) : null}
        </form>
      </div>
    </section>
  );
}

export function TaxonomyManager({ categories, collections }: { categories: Term[]; collections: Term[] }) {
  return (
    <div className="space-y-5">
      <Section title="Blog categories" hint="Used by the blog filter chips and post organising."
        terms={categories} countLabel="posts" saveAction={saveCategory} deleteAction={deleteCategory} />
      <Section title="Gallery collections" hint="Groups gallery images and drives the public filters."
        terms={collections} countLabel="images" saveAction={saveCollection} deleteAction={deleteCollection} />
    </div>
  );
}
