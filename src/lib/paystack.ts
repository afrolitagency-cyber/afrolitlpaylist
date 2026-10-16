const PAYSTACK_API = "https://api.paystack.co";

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) return null;
  return key;
}

export function paystackConfigured() {
  return Boolean(secret());
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string }> {
  const key = secret();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  if (!Number.isInteger(input.amountKobo) || input.amountKobo < 1) {
    throw new Error("Amount must be a positive integer in kobo.");
  }

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });

  const body = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string };
  };
  if (!res.ok || !body.status || !body.data?.authorization_url) {
    throw new Error(body.message || "Paystack did not start the payment.");
  }
  return { authorizationUrl: body.data.authorization_url };
}

export async function verifyTransaction(reference: string): Promise<{
  success: boolean;
  amountKobo: number | null;
  feesKobo: number | null;
  metadata: Record<string, unknown> | null;
}> {
  const key = secret();
  if (!key) return { success: false, amountKobo: null, feesKobo: null, metadata: null };

  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await res.json()) as {
    status?: boolean;
    data?: {
      status?: string;
      amount?: number;
      fees?: number;
      metadata?: Record<string, unknown>;
    };
  };
  const paid = Boolean(body.status && body.data?.status === "success");
  const amount = body.data?.amount;
  const fees = body.data?.fees;
  return {
    success: paid,
    amountKobo: typeof amount === "number" && Number.isInteger(amount) ? amount : null,
    feesKobo: typeof fees === "number" && Number.isInteger(fees) ? fees : null,
    metadata: parseMetadata(body.data?.metadata),
  };
}
