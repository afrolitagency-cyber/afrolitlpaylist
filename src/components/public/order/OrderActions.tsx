"use client";

import styles from "./order.module.css";

export function OrderActions({
  ics,
  fileSlug,
  receiptHref,
}: {
  ics: string;
  fileSlug: string;
  receiptHref: string;
}) {
  function downloadIcs() {
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSlug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.acts}>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => window.print()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
        Tickets
      </button>
      <a className={styles.btn} href={receiptHref}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>
        Receipt
      </a>
      <button type="button" className={styles.btn} onClick={downloadIcs}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
        Calendar
      </button>
    </div>
  );
}
