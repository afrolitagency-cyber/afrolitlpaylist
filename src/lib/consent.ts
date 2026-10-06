export type Consent = "granted" | "denied";

const KEY = "al_consent";

/** A decision was made. Detail is the new value. */
export const CONSENT_EVENT = "al:consent";
/** The footer link was clicked — show the bar again. */
export const CONSENT_OPEN_EVENT = "al:consent-open";

/**
 * localStorage, not a cookie. Setting a tracking cookie in order to record
 * "no tracking cookies please" is the kind of thing that makes people distrust
 * banners, and the choice only ever needs to be read by client-side code.
 */
export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    // Private mode or storage blocked. Returning null means the bar shows
    // again next visit, which is the safe direction to fail in.
    return null;
  }
}

export function writeConsent(value: Consent): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* the choice holds for this page view only */
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
