/** Presets for the admin dropdown. Stored as TicketTier.name. */
export const TICKET_KINDS = [
  "Super Early Bird",
  "Early Bird",
  "Regular",
  "VIP",
  "Early Bird VIP",
  "Regular VIP",
  "VVIP",
  "Table of 10",
  "Media",
] as const;

export type TicketKind = (typeof TICKET_KINDS)[number];

export const CUSTOM_TICKET_KIND = "custom";

export function matchTicketKind(name: string): TicketKind | typeof CUSTOM_TICKET_KIND {
  const found = TICKET_KINDS.find((k) => k.toLowerCase() === name.trim().toLowerCase());
  return found ?? CUSTOM_TICKET_KIND;
}

export function defaultsForKind(kind: string): { admitsCount?: number; isComp?: boolean } {
  if (kind === "Table of 10") return { admitsCount: 10, isComp: false };
  if (kind === "Media") return { isComp: true };
  return { isComp: false };
}
