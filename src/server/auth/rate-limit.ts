const WINDOW_MS = 60_000;
const MAX_IP_FAILURES_PER_MINUTE = 30;
const MAX_ACCOUNT_FAILURES_PER_WINDOW = 8;
const ACCOUNT_WINDOW_MS = 15 * 60_000;
const ACCOUNT_LOCK_MS = 15 * 60_000;
const MAX_BUCKETS = 10_000;

interface WindowCounter {
  count: number;
  resetAt: number;
}

interface AccountCounter {
  count: number;
  resetAt: number;
  lockedUntil: number;
}

interface RateLimitStore {
  ipFailures: Map<string, WindowCounter>;
  accountFailures: Map<string, AccountCounter>;
}

const globalForRateLimit = globalThis as unknown as {
  __authRateLimit?: RateLimitStore;
};

const store: RateLimitStore =
  globalForRateLimit.__authRateLimit ??
  ({ ipFailures: new Map(), accountFailures: new Map() } as RateLimitStore);

globalForRateLimit.__authRateLimit = store;

function prune(now: number): void {
  if (store.ipFailures.size + store.accountFailures.size <= MAX_BUCKETS) {
    return;
  }
  for (const [key, entry] of store.ipFailures) {
    if (entry.resetAt <= now) {
      store.ipFailures.delete(key);
    }
  }
  for (const [key, entry] of store.accountFailures) {
    if (entry.lockedUntil <= now && entry.resetAt <= now) {
      store.accountFailures.delete(key);
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAuthRateLimited(
  ip: string | null,
  email: string,
): boolean {
  const now = Date.now();
  prune(now);

  const account = store.accountFailures.get(normalizeEmail(email));
  if (account && account.lockedUntil > now) {
    return true;
  }

  const ipKey = ip ?? "unknown";
  const window = store.ipFailures.get(ipKey);
  if (window && window.resetAt > now && window.count >= MAX_IP_FAILURES_PER_MINUTE) {
    return true;
  }
  return false;
}

export function recordAuthFailure(ip: string | null, email: string): void {
  const now = Date.now();
  prune(now);

  const ipKey = ip ?? "unknown";
  const existingWindow = store.ipFailures.get(ipKey);
  if (!existingWindow || existingWindow.resetAt <= now) {
    store.ipFailures.set(ipKey, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    existingWindow.count += 1;
  }

  const accountKey = normalizeEmail(email);
  const account = store.accountFailures.get(accountKey);
  if (!account || account.resetAt <= now) {
    store.accountFailures.set(accountKey, {
      count: 1,
      resetAt: now + ACCOUNT_WINDOW_MS,
      lockedUntil: 0,
    });
    return;
  }
  if (account.lockedUntil > now) {
    return;
  }
  account.count += 1;
  if (account.count >= MAX_ACCOUNT_FAILURES_PER_WINDOW) {
    account.lockedUntil = now + ACCOUNT_LOCK_MS;
    account.count = 0;
    account.resetAt = now + ACCOUNT_WINDOW_MS;
  }
}

export function clearAuthFailures(email: string): void {
  store.accountFailures.delete(normalizeEmail(email));
}
