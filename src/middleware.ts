import { getTtl, incrCache } from "@/lib/cache/redis";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Fallback in-memory rate limiter if Redis is unavailable
const hits = new Map<string, { count: number; resetAt: number }>();

async function checkRate(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const redisKey = `ratelimit:${key}`;
  const count = await incrCache(redisKey, Math.ceil(windowMs / 1000));

  if (count !== null) {
    if (count <= maxRequests) {
      return { allowed: true };
    }
    const ttl = await getTtl(redisKey);
    return { allowed: false, retryAfter: ttl || Math.ceil(windowMs / 1000) };
  }

  // Fallback to in-memory
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now >= entry.resetAt) hits.delete(key);
  }
}, 300_000);

// Rate limit tiers by route pattern
function getLimits(
  pathname: string,
  method: string,
): { max: number; windowMs: number } {
  // Email sending — strictest limit
  if (pathname === "/api/emails" && method === "POST") {
    return { max: 20, windowMs: 60_000 };
  }
  if (pathname === "/api/emails/batch" && method === "POST") {
    return { max: 5, windowMs: 60_000 };
  }
  // API key management — tight limit
  if (pathname.startsWith("/api/api-keys") && method !== "GET") {
    return { max: 10, windowMs: 60_000 };
  }
  // Domain operations
  if (pathname.startsWith("/api/domains") && method === "POST") {
    return { max: 10, windowMs: 60_000 };
  }
  // Auth verify — prevent brute force
  if (pathname === "/api/auth/verify") {
    return { max: 10, windowMs: 60_000 };
  }
  // All other write operations — general limit
  if (method !== "GET") {
    return { max: 30, windowMs: 60_000 };
  }
  // GET requests — generous limit
  return { max: 100, windowMs: 60_000 };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect non-API page routes with session check
  if (!pathname.startsWith("/api/")) {
    // Allow auth page and static assets
    if (
      pathname === "/auth" ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon")
    ) {
      return NextResponse.next();
    }
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    return NextResponse.next();
  }

  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = /^[\d.a-fA-F:]+$/.test(rawIp) ? rawIp : "unknown";
  const authKey = request.headers.get("authorization")?.slice(0, 20) ?? "anon";
  const rateLimitKey = `${ip}:${authKey}:${pathname}`;

  const { max, windowMs } = getLimits(pathname, request.method);
  const result = await checkRate(rateLimitKey, max, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter) },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
