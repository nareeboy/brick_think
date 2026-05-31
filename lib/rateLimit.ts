// In-process fixed-window rate limiter. Per-instance only — a multi-instance
// deploy gives each replica its own window, so the effective cap is
// `limit * replicas`. That's acceptable for the abuse-throttling use case
// here (the goal is to keep one logged-in user from minting thousands of
// tokens per second); for hard quotas use an external store.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  sweep(now);
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: existing.resetAt - now,
      remaining: 0,
    };
  }
  existing.count += 1;
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: limit - existing.count,
  };
}

export function __resetRateLimitForTests(): void {
  store.clear();
  lastSweep = 0;
}
