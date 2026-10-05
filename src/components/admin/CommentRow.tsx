"use client";

import { useActionState } from "react";
import { moderateComment } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/_result";

export type CommentItem = {
  id: string;
  name: string;
  email: string;
  body: string;
  status: string;
  createdAt: string;
  postTitle: string;
};

export function CommentRow({ comment }: { comment: CommentItem }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(moderateComment, null);

  return (
    <div className="border-b border-(--border-strong) px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <b className="text-sm">{comment.name}</b>
          <span className="ml-2 text-xs text-(--sub-text)">on {comment.postTitle}</span>
          <p className="mt-1.5 text-[14px] leading-relaxed text-(--sub-text)">{comment.body}</p>
          <span className="mt-1.5 block text-xs text-(--sub-text)">{comment.createdAt}</span>
        </div>

        <form action={action} className="flex gap-2">
          <input type="hidden" name="id" value={comment.id} />
          <button name="decision" value="APPROVED" disabled={pending}
            className="rounded bg-(--primary) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
            Approve
          </button>
          <button name="decision" value="REJECTED" disabled={pending}
            className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold disabled:opacity-60">
            Reject
          </button>
        </form>
      </div>
      {state ? (
        <p className={`mt-2 text-xs ${state.ok ? "text-emerald-400" : "text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
    </div>
  );
}
