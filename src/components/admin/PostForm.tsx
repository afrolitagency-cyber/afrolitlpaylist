"use client";

import { useActionState, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { savePost } from "@/lib/actions/posts";
import type { ActionState } from "@/lib/actions/_result";
import { BlockEditor } from "./BlockEditor";
import { CoverImageField } from "./CoverImageField";
import { Opt, Req } from "@/components/admin/FieldMarks";

type Option = { id: string; name: string };

export type PostFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: PartialBlock[] | null;
  coverImage: string;
  categoryId: string;
  artistId: string;
  tags: string;
  status: string;
  publishedAt: string;
  featured: boolean;
  commentsOn: boolean;
};

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export function PostForm({
  values,
  categories,
  artists,
}: {
  values: PostFormValues;
  categories: Option[];
  artists: Option[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePost, null);
  const [status, setStatus] = useState(values.status);
  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);
  const [excerpt, setExcerpt] = useState(values.excerpt);
  const [tags, setTags] = useState(values.tags);
  const detail = state && !state.ok && state.fieldErrors
    ? Object.entries(state.fieldErrors).map(([name, messages]) => `${name}: ${messages?.[0] ?? "invalid"}`).join(" ")
    : null;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="status" value={status} />

      <div className="space-y-5">
        {state ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={`rounded border p-3 text-sm ${
              state.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"
            }`}
          >
            {state.ok ? state.message : detail || state.error}
          </p>
        ) : null}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4">
            <label className={label} htmlFor="title">Title<Req /></label>
            <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={field} />
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="slug">Slug<Opt /></label>
            <input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className={field} />
            <p className="mt-1.5 text-xs text-(--sub-text)">Leave blank to generate from the title.</p>
          </div>
          <div>
            <label className={label} htmlFor="excerpt">Excerpt<Opt /></label>
            <textarea id="excerpt" name="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label}>Body<Opt /></label>
          <p className="mb-2 text-xs text-(--sub-text)">Required before publishing. A draft can be empty.</p>
          <BlockEditor name="body" initialContent={values.body} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Publish</h3>
          <div className="mb-4">
            <label className={label} htmlFor="status-select">Status</label>
            <select
              id="status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={field}
            >
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="publishedAt">Publish date</label>
            <input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={values.publishedAt} className={field} />
            <p className="mt-1.5 text-[11px] text-(--sub-text)">Leave blank and we stamp the exact time you click Publish.</p>
          </div>
          <button type="submit" disabled={pending}
            className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : status === "PUBLISHED" ? "Publish" : "Save"}
          </button>
          {status === "PUBLISHED" ? (
            <p className="mt-2 text-xs text-(--sub-text)">Publishing snapshots the post to its revision history.</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Organise</h3>
          <div className="mb-4">
            <label className={label} htmlFor="categoryId">Category<Opt /></label>
            <select id="categoryId" name="categoryId" defaultValue={values.categoryId} className={field}>
              <option value="">— none —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="artistId">Link to artist<Opt /></label>
            <select id="artistId" name="artistId" defaultValue={values.artistId} className={field}>
              <option value="">— none —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="tags">Tags<Opt /></label>
            <input id="tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" className={field} />
          </div>
          <CoverImageField defaultValue={values.coverImage} />
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Feature on homepage</span>
            <input type="checkbox" name="featured" defaultChecked={values.featured} className="size-4 accent-(--primary)" />
          </label>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Allow comments</span>
            <input type="checkbox" name="commentsOn" defaultChecked={values.commentsOn} className="size-4 accent-(--primary)" />
          </label>
        </div>
      </div>
    </form>
  );
}
