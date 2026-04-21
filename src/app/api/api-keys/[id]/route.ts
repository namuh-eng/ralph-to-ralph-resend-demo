import { getServerSession, unauthorizedResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ── GET /api/api-keys/:id ───────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  try {
    const [key] = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        tokenPreview: apiKeys.tokenPreview,
        permission: apiKeys.permission,
        domain: apiKeys.domain,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!key) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    return Response.json({
      id: key.id,
      name: key.name,
      key_prefix: key.tokenPreview,
      permission: key.permission,
      domain_id: key.domain,
      created_at: key.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get API key";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ── PATCH /api/api-keys/:id ─────────────────────────────────────────

interface UpdateApiKeyBody {
  name?: string;
  permission?: "full_access" | "sending_access";
  domain_id?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  let body: UpdateApiKeyBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.permission !== undefined) updates.permission = body.permission;
    if (body.domain_id !== undefined) updates.domain = body.domain_id;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(apiKeys)
      .set(updates)
      .where(eq(apiKeys.id, id))
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        tokenPreview: apiKeys.tokenPreview,
        permission: apiKeys.permission,
        domain: apiKeys.domain,
        createdAt: apiKeys.createdAt,
      });

    if (!updated) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    return Response.json({
      id: updated.id,
      name: updated.name,
      key_prefix: updated.tokenPreview,
      permission: updated.permission,
      domain_id: updated.domain,
      created_at: updated.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update API key";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ── DELETE /api/api-keys/:id ────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  try {
    const [deleted] = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning({ id: apiKeys.id });

    if (!deleted) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete API key";
    return Response.json({ error: message }, { status: 500 });
  }
}
