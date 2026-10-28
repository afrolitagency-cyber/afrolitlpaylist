"use client";

import { useActionState } from "react";
import { saveAdCreative, deleteAdCreative } from "@/lib/actions/ads";
import type { ActionState } from "@/lib/actions/_result";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { Opt, Req } from "@/components/admin/FieldMarks";
import type { AdPlacement } from "@prisma/client";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

function forInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdCreativeForm({
  slotId,
  placement,
  sizeHint,
  creative,
}: {
  slotId: string;
  placement: AdPlacement;
  sizeHint: string;
  creative?: {
    id: string;
    name: string;
    advertiser: string | null;
    imageUrl: string | null;
    imageUrlMobile: string | null;
    altText: string | null;
    clickUrl: string | null;
    trackerUrl: string | null;
    headline: string | null;
    body: string | null;
    thumbUrl: string | null;
    ctaLabel: string | null;
    weight: number;
    startsAt: Date | null;
    endsAt: Date | null;
    active: boolean;
    isHouse: boolean;
    impressions: number;
    clicks: number;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAdCreative, null);
  const [, remove] = useActionState<ActionState, FormData>(deleteAdCreative, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const detail = fieldErrors
    ? Object.entries(fieldErrors).map(([name, messages]) => `${name}: ${messages?.[0] ?? "invalid"}`).join(" ")
    : null;
  const native = placement === "IN_FEED_NATIVE";
  const mobileHint = native
    ? "Optional thumbnail, 240 × 240"
    : placement === "SIDEBAR_RECTANGLE"
      ? "300 × 250"
      : "320 × 100";

  return (
    <form action={action} className="rounded-xl border border-(--border-strong) bg-(--surface) p-4">
      {creative ? <input type="hidden" name="id" value={creative.id} /> : null}
      <input type="hidden" name="slotId" value={slotId} />

      {state ? (
        <p role={state.ok ? "status" : "alert"} className={`mb-3 rounded border p-2.5 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : [state.error, detail].filter(Boolean).join(" ")}
        </p>
      ) : null}

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`name-${creative?.id ?? "new"}`}>Name<Req /></label>
          <input id={`name-${creative?.id ?? "new"}`} name="name" required defaultValue={creative?.name ?? ""} className={field} />
        </div>
        <div>
          <label className={label} htmlFor={`adv-${creative?.id ?? "new"}`}>Advertiser<Opt /></label>
          <input id={`adv-${creative?.id ?? "new"}`} name="advertiser" defaultValue={creative?.advertiser ?? ""} className={field} />
        </div>
      </div>

      {native ? (
        <>
          <div className="mb-3">
            <label className={label} htmlFor={`hl-${creative?.id ?? "new"}`}>Headline<Req /></label>
            <input id={`hl-${creative?.id ?? "new"}`} name="headline" required defaultValue={creative?.headline ?? ""} className={field} />
          </div>
          <div className="mb-3">
            <label className={label} htmlFor={`body-${creative?.id ?? "new"}`}>Teaser<Opt /></label>
            <input id={`body-${creative?.id ?? "new"}`} name="body" defaultValue={creative?.body ?? ""} className={field} />
          </div>
          <CoverImageField
            name="thumbUrl"
            label="Thumbnail"
            defaultValue={creative?.thumbUrl ?? ""}
            hint={mobileHint}
            shape="square"
          />
          <div className="mb-3">
            <label className={label} htmlFor={`cta-${creative?.id ?? "new"}`}>CTA label<Opt /></label>
            <input id={`cta-${creative?.id ?? "new"}`} name="ctaLabel" defaultValue={creative?.ctaLabel ?? ""} placeholder="Learn more" className={field} />
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-(--sub-text)">Required size: {sizeHint}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <CoverImageField name="imageUrl" label="Desktop image" defaultValue={creative?.imageUrl ?? ""} hint={sizeHint} />
            <CoverImageField name="imageUrlMobile" label="Mobile image" defaultValue={creative?.imageUrlMobile ?? ""} hint={mobileHint} />
          </div>
          <div className="mb-3">
            <label className={label} htmlFor={`alt-${creative?.id ?? "new"}`}>Alt text<Opt /></label>
            <input id={`alt-${creative?.id ?? "new"}`} name="altText" defaultValue={creative?.altText ?? ""} className={field} />
          </div>
        </>
      )}

      <div className="mb-3">
        <label className={label} htmlFor={`click-${creative?.id ?? "new"}`}>Click URL<Req /></label>
        <input
          id={`click-${creative?.id ?? "new"}`}
          name="clickUrl"
          type="url"
          required
          defaultValue={creative?.clickUrl ?? ""}
          placeholder="https://example.com"
          className={`${field} ${fieldErrors?.clickUrl ? "border-(--primary)" : ""}`}
        />
        {fieldErrors?.clickUrl?.[0] ? (
          <p className="mt-1 text-xs text-(--primary)">{fieldErrors.clickUrl[0]}</p>
        ) : (
          <p className="mt-1 text-xs text-(--sub-text)">Full destination, including https:// — not just the placeholder.</p>
        )}
      </div>
      <div className="mb-3">
        <label className={label} htmlFor={`w-${creative?.id ?? "new"}`}>Weight<Opt /></label>
        <input id={`w-${creative?.id ?? "new"}`} name="weight" type="number" min={1} max={99} defaultValue={creative?.weight ?? 1} className={field} />
        <p className="mt-1 text-xs text-(--sub-text)">
          Relative share when several creatives are live. Evens out over a day rather than minute to minute.
        </p>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`from-${creative?.id ?? "new"}`}>Starts<Opt /></label>
          <input id={`from-${creative?.id ?? "new"}`} name="startsAt" type="datetime-local" defaultValue={forInput(creative?.startsAt)} className={field} />
        </div>
        <div>
          <label className={label} htmlFor={`to-${creative?.id ?? "new"}`}>Ends<Opt /></label>
          <input id={`to-${creative?.id ?? "new"}`} name="endsAt" type="datetime-local" defaultValue={forInput(creative?.endsAt)} className={field} />
        </div>
      </div>

      <label className="flex items-center justify-between py-2 text-sm">
        <span>Active</span>
        <input type="checkbox" name="active" defaultChecked={creative?.active ?? true} className="size-4 accent-(--primary)" />
      </label>
      <label className="flex items-center justify-between py-2 text-sm">
        <span>House ad (unsold fill — keep off brand red as a full-bleed fill)</span>
        <input type="checkbox" name="isHouse" defaultChecked={creative?.isHouse ?? false} className="size-4 accent-(--primary)" />
      </label>

      {creative ? (
        <p className="mt-2 text-xs text-(--sub-text)">
          {creative.impressions.toLocaleString()} impressions · {creative.clicks.toLocaleString()} clicks
          {creative.isHouse
            ? " · Internal only — do not send these numbers to a brand."
            : " · Use this row for the advertiser closeout."}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : creative ? "Save creative" : "Add creative"}
        </button>
        {creative ? (
          <button type="submit" formAction={remove} formNoValidate className="rounded border border-(--primary)/40 px-4 py-2 text-sm font-bold text-(--primary)">
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}
