/**
 * In-memory sliding-window rate limiter.
 *
 * Keyed by an arbitrary string (typically IP address or "anon").
 * Each entry holds an array of timestamps (ms) for requests within the window.
 * Entries are cleaned up lazily on each check.
 *
 * NOTE: State is per-process. On multi-instance deployments a shared store
 * (Redis, etc.) would be needed. Sufficient for single-server / edge-function
 * deployments used today.
 */

const store = new Map<string, number[]>();

export interface RateLimitOptions {
  /** Maximum number of requests allowed within windowMs. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Default options applied to all import API routes.
 * 30 requests per 60 seconds per IP.
 */
export const IMPORT_RATE_LIMIT: RateLimitOptions = {
  limit: 30,
  windowMs: 60_000,
};

/**
 * Checks whether `key` has exceeded the rate limit.
 * Mutates internal state to record the current request on success.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = IMPORT_RATE_LIMIT
): RateLimitResult {
  const { limit, windowMs } = options;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Retrieve and prune stale timestamps.
  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    // Oldest timestamp tells us when the window opens up.
    const oldestInWindow = timestamps[0]!;
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSec = Math.ceil(retryAfterMs / 1_000);
    store.set(key, timestamps);
    return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { ok: true };
}

/**
 * Clears all rate-limit state. Intended for tests only.
 */
export function _resetRateLimitStore(): void {
  store.clear();
}
