import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

const client = REDIS_URL ? createClient({ url: REDIS_URL }) : null;

if (client) {
  client.on("error", (err) => console.error("Redis Client Error", err));
  client.connect().catch((err) => console.error("Redis Connection Error", err));
}

export async function getCached<T>(key: string): Promise<T | null> {
  if (!client) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function setCache(
  key: string,
  value: any,
  ttlSeconds = 300,
): Promise<void> {
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Fail silently - cache is optional
  }
}

export async function incrCache(key: string, ttlSeconds: number): Promise<number | null> {
  if (!client) return null;
  try {
    const multi = client.multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds, "NX");
    const replies = await multi.exec();
    const count = replies?.[0];
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

export async function getTtl(key: string): Promise<number | null> {
  if (!client) return null;
  try {
    return await client.ttl(key);
  } catch {
    return null;
  }
}

export async function invalidateCache(key: string): Promise<void> {
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // Fail silently
  }
}
