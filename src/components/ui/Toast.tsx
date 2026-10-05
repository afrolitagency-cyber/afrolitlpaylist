"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string };

const ToastContext = createContext<{ push: (message: string, tone?: Tone) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const TONE: Record<Tone, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  error: "border-(--primary)/40 bg-(--primary)/10 text-(--primary)",
  info: "border-(--border-strong) bg-(--card-bg) text-(--body-text)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* polite: announced after the current action, never interrupting */}
      <div aria-live="polite" aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-lg border p-3.5 text-sm shadow-lg ${TONE[t.tone]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Surfaces a Server Action result as a toast. Forms already render inline
 * errors; this is for confirmations that would otherwise scroll out of view.
 */
export function useActionToast(state: { ok: boolean; message?: string; error?: string } | null) {
  const { push } = useToast();
  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) push(state.message, "success");
    if (!state.ok && state.error) push(state.error, "error");
  }, [state, push]);
}
