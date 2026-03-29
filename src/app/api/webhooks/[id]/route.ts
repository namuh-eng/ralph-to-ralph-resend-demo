import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const webhook = await db.query.webhooks.findFirst({
      where: eq(webhooks.id, id),
    });

    if (!webhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }

    return Response.json({
      object: "webhook",
      id: webhook.id,
      endpoint: webhook.endpoint,
      events: webhook.events,
      active: webhook.active,
      signing_secret: webhook.signingSecret,
      created_at: webhook.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve webhook";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (body.endpoint !== undefined) updateData.endpoint = body.endpoint;
    if (body.events !== undefined) updateData.events = body.events;
    if (body.active !== undefined) updateData.active = body.active;

    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning();

    if (!updated) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }

    return Response.json({
      object: "webhook",
      id: updated.id,
      endpoint: updated.endpoint,
      events: updated.events,
      active: updated.active,
      created_at: updated.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update webhook";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(webhooks)
      .where(eq(webhooks.id, id))
      .returning({ id: webhooks.id });

    if (!deleted) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete webhook";
    return Response.json({ error: message }, { status: 500 });
  }
}
