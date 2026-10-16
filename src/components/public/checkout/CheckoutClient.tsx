"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { startCheckout } from "@/lib/actions/checkout";
import type { ActionState } from "@/lib/actions/_result";
import type { CheckoutTier } from "@/lib/checkout";
import { MAX_TICKETS_PER_ORDER } from "@/lib/ticket-limits";
import { formatKobo } from "@/lib/money";
import styles from "./checkout.module.css";

export function CheckoutClient({
  eventId,
  slug,
  title,
  when,
  venue,
  coverImage,
  paystackReady,
  tiers,
}: {
  eventId: string;
  slug: string;
  title: string;
  when: string;
  venue: string;
  coverImage: string | null;
  paystackReady: boolean;
  tiers: CheckoutTier[];
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [step, setStep] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [diffNames, setDiffNames] = useState(false);
  const [holders, setHolders] = useState<string[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(startCheckout, null);

  useEffect(() => {
    if (state?.ok && state.authorizationUrl) {
      window.location.assign(state.authorizationUrl);
    }
  }, [state]);

  const lines = useMemo(
    () => tiers.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ ...t, n: qty[t.id] ?? 0 })),
    [tiers, qty],
  );
  const count = lines.reduce((n, l) => n + l.n, 0);
  const guests = lines.reduce((n, l) => n + l.n * l.admitsCount, 0);
  const totalKobo = lines.reduce((n, l) => n + l.priceKobo * l.n, 0);

  function setLine(id: string, next: number) {
    const tier = tiers.find((t) => t.id === id);
    if (!tier || tier.status !== "onsale") return;
    const others = count - (qty[id] ?? 0);
    const capped = Math.max(
      0,
      Math.min(next, tier.remaining, tier.maxPerOrder, MAX_TICKETS_PER_ORDER - others),
    );
    setQty((q) => ({ ...q, [id]: capped }));
  }

  function goPay() {
    if (buyerName.trim().length < 2) {
      setDetailError("Enter the buyer’s name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(buyerEmail.trim())) {
      setDetailError("Enter a valid email.");
      return;
    }
    if (buyerPhone.replace(/\D/g, "").length < 7) {
      setDetailError("Enter a valid phone number.");
      return;
    }
    setDetailError(null);
    setStep(3);
  }

  const itemsJson = JSON.stringify(lines.map((l) => ({ tierId: l.id, qty: l.n })));
  const holderJson = JSON.stringify(diffNames ? holders : []);
  const slots: string[] = [];
  lines.forEach((l) => {
    for (let i = 0; i < l.n; i += 1) slots.push(`${l.name} · ticket ${i + 1}`);
  });

  return (
    <div className={styles.page}>
      <p className={styles.lock}>Secure checkout · Paystack</p>
      <div className={styles.wrap}>
        <nav className={styles.steps} aria-label="Checkout steps">
          <div className={`${styles.s} ${step === 1 ? styles.sOn : ""} ${step > 1 ? styles.sDone : ""}`}><i>1</i><span>Tickets</span></div>
          <div className={`${styles.ln} ${step > 1 ? styles.lnOn : ""}`} />
          <div className={`${styles.s} ${step === 2 ? styles.sOn : ""} ${step > 2 ? styles.sDone : ""}`}><i>2</i><span>Details</span></div>
          <div className={`${styles.ln} ${step > 2 ? styles.lnOn : ""}`} />
          <div className={`${styles.s} ${step === 3 ? styles.sOn : ""}`}><i>3</i><span>Payment</span></div>
        </nav>

        <div className={styles.co}>
          <section>
            {step === 1 ? (
              <div>
                <h2>Choose your tickets</h2>
                <p className={styles.sub}>
                  Mix and match. Each type has its own max per order. Quantity is tickets, not people — a table still counts as one ticket.
                </p>
                {tiers.length === 0 ? <p className={styles.sub}>No ticket types are on sale yet.</p> : null}
                {tiers.map((t) => {
                  const n = qty[t.id] ?? 0;
                  const off = t.status !== "onsale";
                  const atMax = n >= t.maxPerOrder || n >= t.remaining || count >= MAX_TICKETS_PER_ORDER;
                  const perks = (t.description ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
                  const people = t.admitsCount === 1 ? "1 person" : `${t.admitsCount} people`;
                  return (
                    <div key={t.id} className={`${styles.tier} ${n ? styles.tierSel : ""} ${off ? styles.tierOff : ""}`}>
                      <div>
                        <div className={styles.tn}>
                          <b>{t.name}</b>
                          <span className={styles.tg}>{t.tag}</span>
                        </div>
                        <div className={styles.pr}>{formatKobo(t.priceKobo)}</div>
                        {perks.length ? <ul className={styles.perks}>{perks.map((p) => <li key={p}>{p}</li>)}</ul> : null}
                        <p className={styles.meta}>
                          Max {t.maxPerOrder} per order
                          {" · "}
                          Admits {people} per ticket
                        </p>
                      </div>
                      <div className={styles.qs}>
                        <button type="button" aria-label={`Fewer ${t.name}`} disabled={off || n === 0} onClick={() => setLine(t.id, n - 1)}>−</button>
                        <b>{n}</b>
                        <button
                          type="button"
                          aria-label={`More ${t.name}`}
                          disabled={off || atMax}
                          title={n >= t.maxPerOrder ? `Max ${t.maxPerOrder} ${t.name} tickets per order` : undefined}
                          onClick={() => setLine(t.id, n + 1)}
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <button type="button" className={styles.back} onClick={() => setStep(1)}>← Tickets</button>
                <h2>Your details</h2>
                <p className={styles.sub}>
                  We’ll email your tickets here. No account required.
                  {guests !== count ? ` This order is ${count} ticket${count === 1 ? "" : "s"} for ${guests} people.` : ""}
                </p>
                {detailError ? <p className={styles.err} role="alert">{detailError}</p> : null}
                <div className={styles.f}>
                  <label htmlFor="buyerName">Full name</label>
                  <input id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required placeholder="e.g. Ada Obi" autoComplete="name" />
                </div>
                <div className={styles.f}>
                  <label htmlFor="buyerEmail">Email</label>
                  <input id="buyerEmail" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} required placeholder="you@email.com" autoComplete="email" />
                </div>
                <div className={styles.f}>
                  <label htmlFor="buyerPhone">Phone</label>
                  <input id="buyerPhone" type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} required placeholder="+234 …" autoComplete="tel" />
                </div>
                <label className={styles.sw}>
                  <input type="checkbox" checked={diffNames} onChange={(e) => setDiffNames(e.target.checked)} />
                  <span>Put a different name on each ticket (one name per barcode, not per guest)</span>
                </label>
                {diffNames
                  ? slots.map((label, i) => (
                    <div className={styles.f} key={`${label}-${i}`}>
                      <label htmlFor={`h-${i}`}>{label}</label>
                      <input
                        id={`h-${i}`}
                        value={holders[i] ?? ""}
                        onChange={(e) => {
                          const next = [...holders];
                          next[i] = e.target.value;
                          setHolders(next);
                        }}
                        placeholder="Name on ticket"
                      />
                    </div>
                  ))
                  : null}
              </div>
            ) : null}

            {step === 3 ? (
              <form id="pay-form" action={action}>
                <button type="button" className={styles.back} onClick={() => setStep(2)}>← Details</button>
                <h2>Payment</h2>
                <p className={styles.note}>
                  You&apos;ll pay on Paystack (card, transfer, or USSD). We hold your tickets for 15 minutes.
                  Tickets are issued only after Paystack confirms the charge — not when this page redirects.
                </p>
                {!paystackReady ? (
                  <p className={styles.err} role="alert">Payments are not configured on this server yet.</p>
                ) : null}
                {state && !state.ok ? <p className={styles.err} role="alert">{state.error}</p> : null}
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="items" value={itemsJson} />
                <input type="hidden" name="holderNames" value={holderJson} />
                <input type="hidden" name="buyerName" value={buyerName} />
                <input type="hidden" name="buyerEmail" value={buyerEmail} />
                <input type="hidden" name="buyerPhone" value={buyerPhone} />
              </form>
            ) : null}

            <div className={styles.bar}>
              <div className={styles.bt}><span>Total</span><b>{formatKobo(totalKobo)}</b></div>
              {step === 1 ? (
                <button type="button" className={styles.cta} disabled={count === 0} onClick={() => setStep(2)}>
                  {count
                    ? `Continue · ${count} ticket${count > 1 ? "s" : ""}${guests !== count ? ` · ${guests} people` : ""}`
                    : "Select tickets"}
                </button>
              ) : null}
              {step === 2 ? (
                <button type="button" className={styles.cta} onClick={goPay}>Continue to payment</button>
              ) : null}
              {step === 3 ? (
                <button form="pay-form" className={styles.cta} disabled={pending || !paystackReady || count === 0} type="submit">
                  {pending ? "Starting Paystack…" : `Pay ${formatKobo(totalKobo)}`}
                </button>
              ) : null}
            </div>
          </section>

          <aside className={styles.sum}>
            <div className={styles.ev}>
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="" className={styles.evc} />
              ) : (
                <div className={styles.evc} />
              )}
              <div>
                <b>{title}</b>
                <span>{when}</span>
                {venue ? <span>{venue}</span> : null}
              </div>
            </div>
            <div className={styles.hold}>
              <span>{step === 3 ? "Held for 15 minutes after you tap Pay" : "Nothing is held until you pay"}</span>
            </div>
            <div className={styles.sbd}>
              <div>
                {lines.length
                  ? lines.map((l) => (
                    <div key={l.id} className={styles.li}>
                      <span>
                        <b>{l.n} × {l.name}</b>
                        <em>
                          {formatKobo(l.priceKobo)} each
                          {l.admitsCount > 1 ? ` · admits ${l.admitsCount}` : ""}
                        </em>
                      </span>
                      <b>{formatKobo(l.priceKobo * l.n)}</b>
                    </div>
                  ))
                  : <div className={styles.empty}>No tickets selected yet.</div>}
              </div>
              <div className={`${styles.l2} ${styles.tot}`}><span>Total</span><span>{formatKobo(totalKobo)}</span></div>
            </div>
            <div className={styles.safe}>Paystack checkout. No card details are entered on AfroLit.</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
