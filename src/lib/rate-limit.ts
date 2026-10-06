import { Redis } from "@upstash/redis";

/**
 * Shared rate limiting.
 *
 * An in-memory Map resets per serverless instance, so it is a speed bump rather
 * than protection — ten instances means ten times the allowance. When Upstash
 * credentials exist we use Redis, which every instance shares. Without them we
 * fall back to memory so local dev needs no setup, and say so loudly on boot.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn("[rate-limit] No Upstash credentials — falling back to per-instance memory limits.");
}

const memory = new Map<string, { count: number; resetAt: number }>();

export type RateResult = { ok: boolean; remaining: number; resetInSec: number };

export async function rateLimit(key: string, max: number, windowSec: number): Promise<RateResult> {
  if (redis) {
    const redisKey = `rl:${key}`;
    // INCR then EXPIRE only on first hit — the window starts at the first request
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    const ttl = await redis.ttl(redisKey);
    return { ok: count <= max, remaining: Math.max(0, max - count), resetInSec: ttl > 0 ? ttl : windowSec };
  }

  const now = Date.now();
  const rec = memory.get(key);
  if (!rec || rec.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: max - 1, resetInSec: windowSec };
  }
  rec.count += 1;
  return {
    ok: rec.count <= max,
    remaining: Math.max(0, max - rec.count),
    resetInSec: Math.ceil((rec.resetAt - now) / 1000),
  };
}

/** Limits, in one place so they can be reasoned about together. */
export const LIMITS = {
  comment: { max: 3, windowSec: 10 * 60 },
  subscribe: { max: 3, windowSec: 60 * 60 },
  contact: { max: 3, windowSec: 60 * 60 },
  register: { max: 5, windowSec: 60 * 60 },
  views: { max: 60, windowSec: 60 },
  events: { max: 30, windowSec: 60 },
} as const;
