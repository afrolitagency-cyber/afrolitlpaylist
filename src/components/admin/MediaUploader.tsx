"use client";

import { useActionState } from "react";
import { recordUpload } from "@/lib/actions/media";
import type { ActionState } from "@/lib/actions/_result";
import { UploadField } from "@/components/ui/UploadField";

export function MediaUploader() {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordUpload, null);

  return (
    <form action={action} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
        <UploadField name="url" label="Upload to the library" hint="Images up to 10 MB, audio up to 120 MB." />
        <div>
          <label htmlFor="kind" className="mb-1.5 block text-xs font-bold">Type</label>
          <select id="kind" name="kind" className="w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm">
            <option value="image">Image</option>
            <option value="audio">Audio</option>
          </select>
        </div>
        <button type="submit" disabled={pending}
          className="rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Add to library"}
        </button>
      </div>
    </form>
  );
}
