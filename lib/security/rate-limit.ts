const buckets = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(ip: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(ip);

  if (!current || current.expiresAt <= now) {
    buckets.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (current.count >= max) {
    return false;
  }

  current.count += 1;
  buckets.set(ip, current);
  return true;
}
