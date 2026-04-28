import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());
const mockOn = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockSet = vi.hoisted(() => vi.fn());
const mockDel = vi.hoisted(() => vi.fn());
const mockTtl = vi.hoisted(() => vi.fn());
const mockExec = vi.hoisted(() => vi.fn());
const mockIncr = vi.hoisted(() => vi.fn());
const mockExpire = vi.hoisted(() => vi.fn());

vi.mock("redis", () => ({
  createClient: mockCreateClient,
}));

function configureRedisMock() {
  const multi = {
    incr: mockIncr.mockReturnThis(),
    expire: mockExpire.mockReturnThis(),
    exec: mockExec,
  };

  const client = {
    isOpen: false,
    on: mockOn,
    connect: mockConnect.mockImplementation(async () => {
      client.isOpen = true;
      return client;
    }),
    get: mockGet,
    set: mockSet,
    del: mockDel,
    ttl: mockTtl,
    multi: vi.fn(() => multi),
  };

  mockCreateClient.mockReturnValue(client);
  return { client, multi };
}

describe("lib/cache/redis", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.REDIS_URL = "";
    process.env.RATE_LIMIT_BACKEND = "";
  });

  it("defaults RATE_LIMIT_BACKEND to disabled and no-ops without REDIS_URL", async () => {
    const {
      getRateLimitBackend,
      incrCache,
      readCache,
      writeCache,
      deleteCache,
    } = await import("@/lib/cache/redis");

    expect(getRateLimitBackend()).toBe("disabled");
    await expect(incrCache("ratelimit:test", 60)).resolves.toBeNull();
    await expect(readCache("cache:key")).resolves.toEqual({
      status: "unavailable",
      value: null,
    });
    await expect(writeCache("cache:key", { ok: true }, 60)).resolves.toBe(
      "unavailable",
    );
    await expect(deleteCache("cache:key")).resolves.toBe("unavailable");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("uses the configured Redis URL for cache and rate-limit commands", async () => {
    process.env.RATE_LIMIT_BACKEND = "redis";
    process.env.REDIS_URL = "rediss://cache.example:6379";
    configureRedisMock();
    mockExec.mockResolvedValue([3, 1]);
    mockTtl.mockResolvedValue(42);
    mockGet.mockResolvedValue('{"ok":true}');

    const {
      deleteCache,
      getCached,
      getRateLimitBackend,
      getTtl,
      incrCache,
      readCache,
      setCache,
      writeCache,
    } = await import("@/lib/cache/redis");

    expect(getRateLimitBackend()).toBe("redis");
    await setCache("cache:key", { ok: true }, 120);
    await expect(writeCache("cache:key", { ok: true }, 120)).resolves.toBe(
      "written",
    );
    await expect(getCached<{ ok: boolean }>("cache:key")).resolves.toEqual({
      ok: true,
    });
    await expect(readCache<{ ok: boolean }>("cache:key")).resolves.toEqual({
      status: "hit",
      value: { ok: true },
    });
    await expect(incrCache("ratelimit:test", 60)).resolves.toBe(3);
    await expect(getTtl("ratelimit:test")).resolves.toBe(42);
    await expect(deleteCache("cache:key")).resolves.toBe("deleted");

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: "rediss://cache.example:6379",
    });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith("cache:key", '{"ok":true}', {
      EX: 120,
    });
    expect(mockDel).toHaveBeenCalledWith("cache:key");
    expect(mockIncr).toHaveBeenCalledWith("ratelimit:test");
    expect(mockExpire).toHaveBeenCalledWith("ratelimit:test", 60, "NX");
  });
});
