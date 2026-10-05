"use client";

import { useActionState, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { savePost } from "@/lib/actions/posts";
import type { ActionState } from "@/lib/actions/_result";
import { BlockEditor } from "./BlockEditor";

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
            {state.ok ? state.message : state.error}
          </p>
        ) : null}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4">
            <label className={label} htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={values.title} required className={field} />
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="slug">
              Slug <span className="font-normal text-(--sub-text)">— leave blank to generate from the title</span>
            </label>
            <input id="slug" name="slug" defaultValue={values.slug} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="excerpt">Excerpt</label>
            <textarea id="excerpt" name="excerpt" rows={3} defaultValue={values.excerpt} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label}>Body</label>
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
            <label className={label} htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" defaultValue={values.categoryId} className={field}>
              <option value="">— none —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="artistId">
              Link to artist <span className="font-normal text-(--sub-text)">— shows on their page</span>
            </label>
            <select id="artistId" name="artistId" defaultValue={values.artistId} className={field}>
              <option value="">— none —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="tags">Tags</label>
            <input id="tags" name="tags" defaultValue={values.tags} placeholder="comma, separated" className={field} />
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="coverImage">Cover image URL</label>
            <input id="coverImage" name="coverImage" defaultValue={values.coverImage} placeholder="https://res.cloudinary.com/…" className={field} />
          </div>
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
