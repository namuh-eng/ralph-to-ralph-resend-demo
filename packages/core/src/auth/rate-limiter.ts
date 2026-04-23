export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  isAllowed(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private cache = new Map<string, { count: number; reset: number }>();

  async isAllowed(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const item = this.cache.get(key);

    if (!item || now >= item.reset) {
      const reset = now + windowSeconds;
      this.cache.set(key, { count: 1, reset });
      return { success: true, limit, remaining: limit - 1, reset };
    }

    if (item.count >= limit) {
      return { success: false, limit, remaining: 0, reset: item.reset };
    }

    item.count += 1;
    return { success: true, limit, remaining: limit - item.count, reset: item.reset };
  }
}

export class RedisRateLimiter implements RateLimiter {
  // Skeleton for now, as Redis dependency might not be in core yet
  async isAllowed(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    // Falls back to in-memory for this slice unless user provides Redis client
    console.warn("RedisRateLimiter: Redis not implemented, falling back to memory");
    const fallback = new InMemoryRateLimiter();
    return fallback.isAllowed(key, limit, windowSeconds);
  }
}
