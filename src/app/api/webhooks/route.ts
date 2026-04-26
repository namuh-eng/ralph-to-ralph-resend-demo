import { randomBytes } from "node:crypto";
import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { createWebhookSchema } from "@/lib/validation/webhooks";
import { desc, lt } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 20, 1),
    100,
  );
  const after = url.searchParams.get("after") || "";

  try {
    const query = db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        eventTypes: webhooks.eventTypes,
        status: webhooks.status,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks);

    if (after) {
      query.where(lt(webhooks.id, after));
    }

    const results = await query.orderBy(desc(webhooks.id)).limit(limit + 1);

    const hasMore = results.length > limit;
    const dataRows = hasMore ? results.slice(0, limit) : results;

    return Response.json({
      object: "list",
      data: dataRows.map((w) => ({
        id: w.id,
        endpoint: w.url,
        events: w.eventTypes,
        status: w.status === "active" ? "enabled" : "disabled",
        created_at: w.createdAt,
      })),
      has_more: hasMore,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list webhooks";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createWebhookSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 },
    );
  }

  const validated = result.data;
  const endpoint = validated.endpoint || validated.url!;
  const events = validated.events || validated.event_types!;

  try {
    const signingSecret = `whsec_${randomBytes(24).toString("base64url")}`;

    const [webhook] = await db
      .insert(webhooks)
      .values({
        url: endpoint,
        eventTypes: events,
        signingSecret,
      })
      .returning();

    return Response.json(
      {
        object: "webhook",
        id: webhook.id,
        endpoint: webhook.url,
        events: webhook.eventTypes,
        status: webhook.status === "active" ? "enabled" : "disabled",
        signing_secret: webhook.signingSecret,
        created_at: webhook.createdAt,
      },
      { status: 201 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create webhook";
    return Response.json({ error: message }, { status: 500 });
  }
}
