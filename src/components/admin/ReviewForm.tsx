"use client";

import { useActionState } from "react";
import { decideReview } from "@/lib/actions/artists";
import type { ActionState } from "@/lib/actions/_result";

/**
 * Three outcomes, one form. "Request changes" requires a note — enforced in the
 * Zod schema too, so the rule holds even if this UI is bypassed.
 */
export function ReviewForm({ artistId }: { artistId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(decideReview, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="artistId" value={artistId} />

      {state && !state.ok ? (
        <p role="alert" className="rounded border border-(--primary)/40 bg-(--primary)/10 p-3 text-sm text-(--primary)">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        name="decision"
        value="APPROVED"
        disabled={pending}
        className="w-full rounded bg-(--primary) px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Working…" : "Approve & publish"}
      </button>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-xs font-bold">
          Note to artist <span className="font-normal text-(--sub-text)">(required to request changes)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          placeholder="Explain what needs to change…"
          className="w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm"
        />
        {state && !state.ok && state.fieldErrors?.note ? (
          <p className="mt-1 text-xs text-(--primary)">{state.fieldErrors.note[0]}</p>
        ) : null}
      </div>

      <button type="submit" name="decision" value="CHANGES_REQUESTED" disabled={pending}
        className="w-full rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold disabled:opacity-60">
        Request changes
      </button>
      <button type="submit" name="decision" value="REJECTED" disabled={pending}
        className="w-full rounded border border-(--primary)/40 px-4 py-2.5 text-sm font-bold text-(--primary) disabled:opacity-60">
        Reject submission
      </button>

      <p className="text-xs leading-relaxed text-(--sub-text)">
        Requesting changes emails the artist, sets the status to <b>Changes requested</b> and replaces the
        previous note. Resubmitting overwrites this submission.
      </p>
    </form>
  );
}
