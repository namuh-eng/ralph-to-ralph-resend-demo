import { type RedisClientType, createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL?.trim();
const RATE_LIMIT_BACKENDS = ["disabled", "redis"] as const;
export type RateLimitBackend = (typeof RATE_LIMIT_BACKENDS)[number];

type RedisClient = RedisClientType;

export type CacheReadStatus = "hit" | "miss" | "unavailable" | "error";
export type CacheWriteStatus = "written" | "unavailable" | "error";
export type CacheDeleteStatus = "deleted" | "unavailable" | "error";

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;
const loggedMessages = new Set<string>();

function logRedisMessageOnce(level: "warn" | "error", message: string) {
  if (loggedMessages.has(message)) return;
  loggedMessages.add(message);
  console[level](message);
}

function normalizeRateLimitBackend(
  value: string | undefined,
): RateLimitBackend {
  if (!value) return "disabled";

  if ((RATE_LIMIT_BACKENDS as readonly string[]).includes(value)) {
    return value as RateLimitBackend;
  }

  logRedisMessageOnce(
    "warn",
    `[rate-limit] Unsupported RATE_LIMIT_BACKEND="${value}". Falling back to "disabled".`,
  );
  return "disabled";
}

export function getRateLimitBackend(): RateLimitBackend {
  return normalizeRateLimitBackend(
    process.env.RATE_LIMIT_BACKEND?.trim().toLowerCase(),
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL);
}

function getClient(): RedisClient | null {
  if (!REDIS_URL) return null;

  if (!client) {
    client = createClient({ url: REDIS_URL });
    client.on("error", (err) => {
      console.error("Redis Client Error", err);
    });
  }

  return client;
}

async function getConnectedClient(): Promise<RedisClient | null> {
  const redisClient = getClient();
  if (!redisClient) return null;

  if (redisClient.isOpen) return redisClient;

  if (!connectPromise) {
    connectPromise = redisClient
      .connect()
      .then(() => redisClient)
      .catch((err) => {
        connectPromise = null;
        console.error("Redis Connection Error", err);
        return null;
      });
  }

  return connectPromise;
}

export async function readCache<T>(
  key: string,
): Promise<{ status: CacheReadStatus; value: T | null }> {
  const redisClient = await getConnectedClient();
  if (!redisClient) {
    return { status: "unavailable", value: null };
  }

  try {
    const value = await redisClient.get(key);
    if (!value) {
      return { status: "miss", value: null };
    }
    return { status: "hit", value: JSON.parse(value) as T };
  } catch {
    return { status: "error", value: null };
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  const { value } = await readCache<T>(key);
  return value;
}

export async function writeCache(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<CacheWriteStatus> {
  const redisClient = await getConnectedClient();
  if (!redisClient) return "unavailable";

  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return "written";
  } catch {
    return "error";
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  await writeCache(key, value, ttlSeconds);
}

export async function incrCache(
  key: string,
  ttlSeconds: number,
): Promise<number | null> {
  const redisClient = await getConnectedClient();
  if (!redisClient) return null;

  try {
    const replies = await redisClient
      .multi()
      .incr(key)
      .expire(key, ttlSeconds, "NX")
      .exec();
    const count = replies?.[0];
    return typeof count === "number" ? count : null;
  } catch {
    logRedisMessageOnce(
      "error",
      "[rate-limit] Redis rate limit command failed; requests will receive 503 until Redis recovers.",
    );
    return null;
  }
}

export async function getTtl(key: string): Promise<number | null> {
  const redisClient = await getConnectedClient();
  if (!redisClient) return null;

  try {
    return await redisClient.ttl(key);
  } catch {
    return null;
  }
}

export async function invalidateCache(key: string): Promise<void> {
  await deleteCache(key);
}

export async function deleteCache(key: string): Promise<CacheDeleteStatus> {
  const redisClient = await getConnectedClient();
  if (!redisClient) return "unavailable";

  try {
    await redisClient.del(key);
    return "deleted";
  } catch {
    return "error";
  }
}
