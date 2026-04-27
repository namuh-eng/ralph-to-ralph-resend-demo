import { createHash } from "node:crypto";
import { getCached, setCache } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "./auth";

export interface AuthResult {
  apiKeyId: string;
  permission: string;
  domain: string | null;
  userId: string | null;
}

/**
 * Validate an API key from the Authorization header.
 * Returns the API key record if valid, null otherwise.
 */
export async function validateApiKey(
  authHeader: string | null | undefined,
): Promise<AuthResult | null> {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const rawKey = parts[1];
  if (!rawKey) return null;

  const hashedKey = createHash("sha256").update(rawKey).digest("hex");
  const cacheKey = `auth:apikey:${hashedKey}`;

  // 1. Try Cache
  const cached = await getCached<AuthResult>(cacheKey);
  if (cached) return cached;

  // 2. Try DB
  const found = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.tokenHash, hashedKey),
  });

  if (!found) return null;

  const result: AuthResult = {
    apiKeyId: found.id,
    permission: found.permission,
    domain: found.domain,
    userId: found.userId,
  };

  // 3. Set Cache (5 min TTL)
  await setCache(cacheKey, result, 300);

  // Background update lastUsedAt to avoid blocking the request
  // Only update once per minute to avoid write amplification
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  if (!found.lastUsedAt || found.lastUsedAt < oneMinuteAgo) {
    const updatePromise = db
      .update(apiKeys)
      ?.set?.({ lastUsedAt: now })
      ?.where?.(eq(apiKeys.id, found.id))
      ?.execute?.();

    if (updatePromise) {
      updatePromise.catch((err) =>
        console.error("Failed to update API key last_used_at:", err),
      );
    }
  }

  return result;
}

/**
 * Validate the dashboard master key from the Authorization header.
 * Used for internal dashboard endpoints (e.g. /api/api-keys).
 */
export function validateDashboardKey(
  authHeader: string | null | undefined,
): boolean {
  const dashboardKey = process.env.DASHBOARD_KEY;
  if (!dashboardKey) return false;

  if (!authHeader) return false;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  return parts[1] === dashboardKey;
}

/**
 * Helper to create a 401 JSON response.
 */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "Missing or invalid API key" },
    { status: 401 },
  );
}

/**
 * Get the current server session via Better Auth.
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Validate access for dashboard-managed routes that should accept either:
 * - a regular API key,
 * - the dashboard master key, or
 * - an authenticated dashboard session.
 */
export async function authorizeDashboardOrApiKey(
  authHeader: string | null | undefined,
): Promise<AuthResult | { dashboard: true } | null> {
  const apiKeyAuth = await validateApiKey(authHeader);
  if (apiKeyAuth) {
    return apiKeyAuth;
  }

  if (validateDashboardKey(authHeader)) {
    return { dashboard: true };
  }

  const session = await getServerSession();
  if (session) {
    return { dashboard: true };
  }

  return null;
}
