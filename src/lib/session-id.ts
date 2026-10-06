/** A random id that lives only as long as the browser tab session.
 *
 *  sessionStorage, not a cookie and not localStorage: it is never sent
 *  automatically, it disappears when the tab closes, and it is only used to
 *  tell one visit of several pages from several separate visits.
 */
const KEY = "al_sid";

export function getSessionId(): string | null {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
