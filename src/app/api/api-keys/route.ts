import { createHash, randomUUID } from "node:crypto";
import { validateApiKey, unauthorizedResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth || auth.permission !== "full_access") {
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

    return Response.json({
      object: "list",
      data: keys.map(k => ({
        id: k.id,
        name: k.name,
        created_at: k.createdAt,
      }))
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list API keys";
    return Response.json({ error: message }, { status: 500 });
  }
}

interface CreateApiKeyBody {
  name: string;
  permission?: "full_access" | "sending_access";
  domain_id?: string;
}

export async function POST(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth || auth.permission !== "full_access") {
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
      .returning();

    return Response.json({
      id: created.id,
      name: created.name,
      token: rawKey,
    }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create API key";
    return Response.json({ error: message }, { status: 500 });
  }
}
