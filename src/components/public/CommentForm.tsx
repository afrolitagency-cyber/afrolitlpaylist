"use client";

import { useActionState } from "react";
import { submitComment } from "@/lib/actions/public";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitComment, null);

  return (
    <form action={action} className="mt-7 space-y-3">
      <input type="hidden" name="postId" value={postId} />
      {/* honeypot: hidden from people, filled by bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

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

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Your name" className={field} />
        <input name="email" type="email" required placeholder="Email (not published)" className={field} />
      </div>
      <textarea name="body" required rows={5} placeholder="Write a comment…" className={field} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-(--sub-text)">Comments are moderated and appear once approved.</p>
        <button type="submit" disabled={pending}
          className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}
