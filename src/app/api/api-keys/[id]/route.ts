import { validateApiKey, unauthorizedResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth || auth.permission !== "full_access") {
    return unauthorizedResponse();
  }

  const { id } = await params;
  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!key) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    return Response.json({
      id: key.id,
      name: key.name,
      created_at: key.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get API key";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth || auth.permission !== "full_access") {
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

    return Response.json({
      object: "api_key",
      id: deleted.id,
      deleted: true,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete API key";
    return Response.json({ error: message }, { status: 500 });
  }
}
