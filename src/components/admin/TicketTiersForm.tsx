"use client";

import { useActionState, useState } from "react";
import { saveTicketTier, deleteTicketTier } from "@/lib/actions/tickets";
import type { ActionState } from "@/lib/actions/_result";
import { koboToNaira, remaining, formatKobo, venueRemaining } from "@/lib/money";
import {
  CUSTOM_TICKET_KIND,
  TICKET_KINDS,
  defaultsForKind,
  matchTicketKind,
} from "@/lib/ticket-kinds";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

function forInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type TicketTierRow = {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  allocation: number;
  sold: number;
  held: number;
  salesStartsAt: Date | null;
  salesEndsAt: Date | null;
  maxPerOrder: number;
  admitsCount: number;
  rollsIntoTierId: string | null;
  isComp: boolean;
  sortOrder: number;
  active: boolean;
};

type Venue = { capacity: number | null; ticketsSold: number; ticketsHeld: number };

function TierForm({
  eventId,
  tier,
  others,
}: {
  eventId: string;
  tier?: TicketTierRow;
  others: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTicketTier, null);
  const [, remove] = useActionState<ActionState, FormData>(deleteTicketTier, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const detail = fieldErrors
    ? Object.entries(fieldErrors).map(([name, messages]) => `${name}: ${messages?.[0] ?? "invalid"}`).join(" ")
    : null;
  const fid = tier?.id ?? "new";
  const left = tier ? remaining(tier) : null;
  const locked = Boolean(tier && (tier.sold > 0 || tier.held > 0));
  const initialKind = tier ? matchTicketKind(tier.name) : "";
  const [kind, setKind] = useState<string>(initialKind);
  const [customName, setCustomName] = useState(initialKind === CUSTOM_TICKET_KIND ? (tier?.name ?? "") : "");
  const [admits, setAdmits] = useState(tier ? String(tier.admitsCount) : "1");
  const [isComp, setIsComp] = useState(tier?.isComp ?? false);

  function onKindChange(next: string) {
    setKind(next);
    const defaults = defaultsForKind(next);
    if (defaults.admitsCount != null) setAdmits(String(defaults.admitsCount));
    // Only Media is a comp by default. Other kinds must never inherit a leftover Media tick.
    setIsComp(next === "Media");
  }

  const nameValue = kind === CUSTOM_TICKET_KIND ? customName : kind;

  return (
    <form action={action} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
      {tier ? <input type="hidden" name="id" value={tier.id} /> : null}
      <input type="hidden" name="eventId" value={eventId} />

      {state ? (
        <p role={state.ok ? "status" : "alert"} className={`mb-3 rounded border p-2.5 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : [state.error, detail].filter(Boolean).join(" ")}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold">{tier ? tier.name : "New tier"}</h3>
        {tier ? (
          <p className="text-xs text-(--sub-text)">
            {formatKobo(tier.priceKobo)}
            {" · "}
            {left} left of {tier.allocation}
            {tier.held ? ` · ${tier.held} held` : ""}
            {tier.sold ? ` · ${tier.sold} sold` : ""}
            {tier.admitsCount > 1 ? ` · admits ${tier.admitsCount}` : ""}
            {tier.isComp ? " · Comp" : ""}
            {tier.active ? "" : " · Inactive"}
          </p>
        ) : (
          <p className="text-xs text-(--sub-text)">Price is whole naira. Stored as kobo.</p>
        )}
      </div>

      <input type="hidden" name="name" value={nameValue} />

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`kind-${fid}`}>Tier</label>
          <select
            id={`kind-${fid}`}
            value={kind}
            onChange={(e) => onKindChange(e.target.value)}
            required
            className={field}
          >
            <option value="" disabled>Choose a tier</option>
            {TICKET_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
            <option value={CUSTOM_TICKET_KIND}>Custom…</option>
          </select>
          {kind === CUSTOM_TICKET_KIND ? (
            <input
              className={`${field} mt-2`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Friends & family"
              required
              aria-label="Custom tier name"
            />
          ) : null}
        </div>
        <div>
          <label className={label} htmlFor={`price-${fid}`}>Price (₦)</label>
          <input
            id={`price-${fid}`}
            name="priceNaira"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={tier ? String(koboToNaira(tier.priceKobo)) : "0"}
            className={field}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className={label} htmlFor={`desc-${fid}`}>Description</label>
        <input id={`desc-${fid}`} name="description" defaultValue={tier?.description ?? ""} className={field} />
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor={`alloc-${fid}`}>Allocation</label>
          <input
            id={`alloc-${fid}`}
            name="allocation"
            type="number"
            min={tier ? tier.sold + tier.held : 1}
            step={1}
            required
            defaultValue={tier ? String(tier.allocation) : ""}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor={`max-${fid}`}>Max per order</label>
          <input id={`max-${fid}`} name="maxPerOrder" type="number" min={1} max={50} defaultValue={tier ? String(tier.maxPerOrder) : "10"} className={field} />
          <p className="mt-1.5 text-xs text-(--sub-text)">How many of this ticket one buyer can add in a single checkout. Not a venue cap.</p>
        </div>
        <div>
          <label className={label} htmlFor={`sort-${fid}`}>Sort</label>
          <input id={`sort-${fid}`} name="sortOrder" type="number" min={0} defaultValue={tier ? String(tier.sortOrder) : "0"} className={field} />
        </div>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`admits-${fid}`}>Admits (people per ticket)</label>
          <input id={`admits-${fid}`} name="admitsCount" type="number" min={1} max={100} value={admits} onChange={(e) => setAdmits(e.target.value)} className={field} />
          <p className="mt-1.5 text-xs text-(--sub-text)">People let in on one barcode. 1 for a seat. 10 for a table of 10 — one scan admits the group. Does not multiply the price.</p>
        </div>
        <div>
          <label className={label} htmlFor={`roll-${fid}`}>Unsold rolls into</label>
          <select id={`roll-${fid}`} name="rollsIntoTierId" defaultValue={tier?.rollsIntoTierId ?? ""} className={field} disabled={others.length === 0}>
            <option value="">— none (leftover expires) —</option>
            {others.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-(--sub-text)">When this window closes with stock left. Needs another tier saved first.</p>
        </div>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`start-${fid}`}>Sales start</label>
          <input id={`start-${fid}`} name="salesStartsAt" type="datetime-local" defaultValue={forInput(tier?.salesStartsAt)} className={field} />
          <p className="mt-1.5 text-xs text-(--sub-text)">Optional label (e.g. Early Bird from 16 Oct). Leave blank to sell now — a future date does not lock checkout.</p>
        </div>
        <div>
          <label className={label} htmlFor={`end-${fid}`}>Sales end</label>
          <input id={`end-${fid}`} name="salesEndsAt" type="datetime-local" defaultValue={forInput(tier?.salesEndsAt)} className={field} />
        </div>
      </div>

      <label className="flex items-center justify-between py-2 text-sm">
        <span>On sale</span>
        <input type="checkbox" name="active" defaultChecked={tier?.active ?? true} className="size-4 accent-(--primary)" />
      </label>
      <label className="flex items-center justify-between py-2 text-sm">
        <span>Comp (not for sale)</span>
        <input type="hidden" name="isComp" value={isComp ? "on" : "off"} />
        <input type="checkbox" checked={isComp} onChange={(e) => setIsComp(e.target.checked)} className="size-4 accent-(--primary)" />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : tier ? "Save tier" : "Add tier"}
        </button>
        {tier && !locked ? (
          <button
            type="submit"
            formNoValidate
            formAction={remove}
            className="rounded border border-(--primary)/40 px-4 py-2.5 text-sm font-bold text-(--primary)"
          >
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function TicketTiersForm({
  eventId,
  tiers,
  venue,
}: {
  eventId: string;
  tiers: TicketTierRow[];
  venue: Venue;
}) {
  const room = venueRemaining(venue);
  return (
    <div className="mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Ticket tiers</h2>
        <p className="mt-1 text-sm text-(--sub-text)">
          Pick a tier from the list (Early Bird, Regular, VIP, VVIP…). Add one row per
          price window — Early Bird VIP is its own tier. Prices are whole naira, stored as kobo.
        </p>
        {venue.capacity != null ? (
          <p className="mt-1 text-sm text-(--sub-text)">
            Venue {venue.capacity}
            {" · "}
            {venue.ticketsSold} sold
            {venue.ticketsHeld ? ` · ${venue.ticketsHeld} held` : ""}
            {room != null ? ` · ${room} left in the room` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-(--sub-text)">No venue capacity set — only tier allocations will cap sales.</p>
        )}
      </div>
      {tiers.map((tier) => (
        <TierForm
          key={tier.id}
          eventId={eventId}
          tier={tier}
          others={tiers.filter((t) => t.id !== tier.id).map((t) => ({ id: t.id, name: t.name }))}
        />
      ))}
      <TierForm
        key="new"
        eventId={eventId}
        others={tiers.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
