import { createHash, randomUUID } from "node:crypto";
import { getServerSession, unauthorizedResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// ── GET /api/api-keys ────────────────────────────────────────────
// Internal dashboard endpoint — requires DASHBOARD_KEY auth

export async function GET(request: Request): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        tokenPreview: apiKeys.tokenPreview,
        permission: apiKeys.permission,
        domain: apiKeys.domain,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));

    return Response.json({ data: keys });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list API keys";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ── POST /api/api-keys ───────────────────────────────────────────

interface CreateApiKeyBody {
  name: string;
  permission?: "full_access" | "sending_access";
  domain_id?: string;
}

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return unauthorizedResponse();
  }

  let body: CreateApiKeyBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || body.name.trim().length === 0) {
    return Response.json({ error: "name is required" }, { status: 422 });
  }

  try {
    // Generate API key: re_ prefix + UUID
    const rawKey = `re_${randomUUID().replace(/-/g, "")}`;
    const tokenHash = createHash("sha256").update(rawKey).digest("hex");
    const tokenPreview = `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`;

    const [created] = await db
      .insert(apiKeys)
      .values({
        name: body.name.trim(),
        tokenHash,
        tokenPreview,
        permission: body.permission ?? "full_access",
        domain: body.domain_id ?? null,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        tokenPreview: apiKeys.tokenPreview,
        permission: apiKeys.permission,
        domain: apiKeys.domain,
        createdAt: apiKeys.createdAt,
      });

    return Response.json({
      id: created.id,
      name: created.name,
      token: rawKey,
      key_prefix: created.tokenPreview,
      permission: created.permission,
      domain_id: created.domain,
      created_at: created.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create API key";
    return Response.json({ error: message }, { status: 500 });
  }
}
