"use client";

export function ReceiptPrint() {
  return (
    <button type="button" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
