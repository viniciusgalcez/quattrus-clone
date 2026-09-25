/**
 * In-memory fixed-window rate limiter. Deliberately not backed by Redis —
 * this app runs as a single `web` replica (see docker-compose.yml), so a
 * per-process Map is sufficient and avoids a new infra dependency. If the
 * app ever scales to multiple replicas, swap this for a shared store; each
 * replica enforcing its own limit independently would only be an issue at
 * that point, not before.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Buckets are cheap and self-expire, but nothing ever removes a stale one —
// sweep occasionally so a long-running process doesn't accumulate an entry
// per distinct key (e.g. every username ever attempted) forever.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let lastSweep = Date.now();
function sweepIfDue(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Returns true if `key` is allowed one more hit within its window, and
 * records the hit. `scope` namespaces the key so different call sites (login,
 * import, ...) can't collide or share a budget.
 */
export function checkRateLimit(
  scope: string,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): boolean {
  const now = Date.now();
  sweepIfDue(now);

  const bucketKey = `${scope}:${key}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count++;
  return true;
}

/** Clears a bucket outright — used by the admin "desbloquear conta" action. */
export function resetRateLimit(scope: string, key: string) {
  buckets.delete(`${scope}:${key}`);
}

export class RateLimitError extends Error {
  constructor(message = "Muitas tentativas. Aguarde um momento e tente novamente.") {
    super(message);
    this.name = "RateLimitError";
  }
}
