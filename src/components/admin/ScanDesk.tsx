"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { checkInTicket } from "@/lib/actions/scan";
import type { ActionState } from "@/lib/actions/_result";

export type ScanEvent = { id: string; title: string; startsAt: string };
export type ScanTicket = {
  id: string;
  code: string;
  holderName: string;
  tier: string;
  isComp: boolean;
  usedAt: string | null;
  voided: boolean;
  email: string;
  reference: string | null;
};

export function ScanDesk({
  events,
  eventId,
  tracker,
  hits,
  query,
}: {
  events: ScanEvent[];
  eventId: string;
  tracker: { sold: number; checkedIn: number; remaining: number; compsIssued: number; compsIn: number };
  hits: ScanTicket[];
  query: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(checkInTicket, null);
  const formRef = useRef<HTMLFormElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camOn, setCamOn] = useState(false);
  const [camHint, setCamHint] = useState("");

  useEffect(() => {
    if (!camOn) return;
    let stop = false;
    let stream: MediaStream | null = null;
    type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
    const DetectorCtor = (window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
    }).BarcodeDetector;
    if (!DetectorCtor) {
      setCamHint("This browser cannot decode QR from the camera. Use Chrome/Edge on the door phone, or paste the code.");
      setCamOn(false);
      return;
    }
    const detector = new DetectorCtor({ formats: ["qr_code"] });
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        const el = videoRef.current;
        if (!el) return;
        el.srcObject = stream;
        await el.play();
        while (!stop) {
          if (el.readyState >= 2) {
            const found = await detector.detect(el);
            const raw = found[0]?.rawValue;
            if (raw && codeRef.current && formRef.current) {
              codeRef.current.value = raw;
              formRef.current.requestSubmit();
              stop = true;
              setCamOn(false);
              break;
            }
          }
          await new Promise((r) => setTimeout(r, 220));
        }
      } catch {
        setCamHint("Camera permission was denied, or no camera is available.");
        setCamOn(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camOn]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-(--border-strong) bg-(--card-bg) p-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold" htmlFor="eventId">Event</label>
          <select id="eventId" value={eventId} onChange={(e) => router.push(`/admin/scan?eventId=${e.target.value}` as Route)}
            className="rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm">
            {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {e.startsAt}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Sold", value: tracker.sold },
          { label: "Checked in", value: tracker.checkedIn },
          { label: "Still to scan", value: tracker.remaining },
          { label: "Comps issued", value: tracker.compsIssued },
          { label: "Comps in", value: tracker.compsIn },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-4">
            <div className="text-[12px] text-(--sub-text)">{s.label}</div>
            <div className="mt-1 text-2xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`rounded border p-4 text-lg font-bold ${state.ok ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-(--primary)/50 bg-(--primary)/15 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <form ref={formRef} action={action} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-1 text-[15px] font-bold">Scan or paste code</h3>
          <p className="mb-3 text-xs text-(--sub-text)">
            New tickets encode a URL so a phone camera opens the order page. At the door, use this camera (Chrome/Edge) or paste the ALP- code. Network errors fail in the open — nothing is queued offline.
          </p>
          {camOn ? (
            <video ref={videoRef} className="mb-3 w-full rounded-lg bg-black" playsInline muted />
          ) : null}
          {camHint ? <p className="mb-2 text-xs text-amber-300">{camHint}</p> : null}
          <input type="hidden" name="eventId" value={eventId} />
          <input ref={codeRef} name="code" required autoComplete="off" autoFocus placeholder="Ticket code or https://…/t/ALP-…"
            className="w-full rounded border border-(--border) bg-(--input-bg) p-3 font-mono text-sm" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={!eventId}
              onClick={() => { setCamHint(""); setCamOn((v) => !v); }}
              className="rounded border border-(--border-strong) py-3 text-sm font-bold disabled:opacity-50">
              {camOn ? "Stop camera" : "Use camera"}
            </button>
            <button type="submit" disabled={pending || !eventId}
              className="rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Checking…" : "Admit"}
            </button>
          </div>
        </form>

        <form className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5" action="/admin/scan">
          <h3 className="mb-1 text-[15px] font-bold">Lookup</h3>
          <p className="mb-3 text-xs text-(--sub-text)">Cracked screen, dead phone — search name, email or Paystack reference.</p>
          <input type="hidden" name="eventId" value={eventId} />
          <input name="q" defaultValue={query} placeholder="Name, email or reference"
            className="w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm" />
          <button type="submit" className="mt-3 rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold">
            Search
          </button>
        </form>
      </div>

      {hits.length ? (
        <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
          {hits.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 border-b border-(--border-strong) px-5 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block text-sm">{t.holderName || t.email}</b>
                <span className="text-xs text-(--sub-text)">
                  {t.tier}{t.isComp ? " · comp" : ""} · {t.code}
                  {t.reference ? ` · ${t.reference}` : ""}
                </span>
              </div>
              {t.voided ? (
                <span className="text-xs font-bold text-(--primary)">Voided</span>
              ) : t.usedAt ? (
                <span className="text-xs font-bold text-amber-300">In at {t.usedAt}</span>
              ) : (
                <form action={action}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="ticketId" value={t.id} />
                  <button type="submit" disabled={pending}
                    className="rounded bg-(--primary) px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    Admit
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : query ? (
        <p className="text-sm text-(--sub-text)">No tickets matched that search.</p>
      ) : null}
    </div>
  );
}
