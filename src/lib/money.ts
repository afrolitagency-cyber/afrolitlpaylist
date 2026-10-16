/** Ticket money is always integer kobo. Display naira is kobo / 100. Never float. */

export function nairaToKobo(naira: number): number {
  return Math.trunc(naira) * 100;
}

export function koboToNaira(kobo: number): number {
  return Math.trunc(kobo / 100);
}

export function remaining(tier: { allocation: number; sold: number; held: number }): number {
  return Math.max(0, tier.allocation - tier.sold - tier.held);
}

/** Room left at the venue. Independent of the sum of tier allocations. */
export function venueRemaining(event: {
  capacity: number | null;
  ticketsSold: number;
  ticketsHeld: number;
}): number | null {
  if (event.capacity == null) return null;
  return Math.max(0, event.capacity - event.ticketsSold - event.ticketsHeld);
}

export function formatNaira(naira: number): string {
  return `₦${naira.toLocaleString("en-US")}`;
}

export function formatKobo(kobo: number): string {
  return formatNaira(koboToNaira(kobo));
}

/** Receipts use kobo as naira with two decimal places. */
export function formatKoboExact(kobo: number): string {
  const naira = Math.trunc(kobo) / 100;
  return `₦${naira.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function percentToBps(percent: number): number {
  return Math.min(10_000, Math.max(0, Math.trunc(percent))) * 100;
}

export function bpsToPercent(bps: number): number {
  return Math.trunc(bps / 100);
}
