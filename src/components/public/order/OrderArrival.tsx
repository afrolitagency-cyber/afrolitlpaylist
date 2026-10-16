"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function OrderArrival({
  paid,
  ticketCount,
  email,
}: {
  paid: boolean;
  ticketCount: number;
  email: string;
}) {
  const { push } = useToast();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!paid) return;
    const fromPaystack = params.has("trxref") || params.has("reference");
    if (!fromPaystack) return;
    const seenKey = `alp-order-toast:${pathname}`;
    if (sessionStorage.getItem(seenKey)) {
      window.history.replaceState({}, "", pathname);
      return;
    }
    sessionStorage.setItem(seenKey, "1");
    const n = ticketCount;
    push(
      `We've emailed your ${n} ticket${n === 1 ? "" : "s"} to ${email}`,
      "success",
      "Payment confirmed",
    );
    window.history.replaceState({}, "", pathname);
  }, [paid, ticketCount, email, params, pathname, push]);

  return null;
}
