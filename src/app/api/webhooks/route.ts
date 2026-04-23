import { randomBytes } from "node:crypto";
import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { desc, lt } from "drizzle-orm";

interface CreateWebhookBody {
  endpoint: string;
  events: string[];
}

function validateCreateBody(body: CreateWebhookBody): string | null {
  if (!body.endpoint) return "endpoint is required";
  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return "events array is required";
  }
  return null;
}

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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Support both legacy (url/event_types) and documented (endpoint/events)
  const endpoint = body.endpoint || body.url;
  const events = body.events || body.event_types;

  const validationError = validateCreateBody({ endpoint, events });
  if (validationError) {
    return Response.json({ error: validationError }, { status: 422 });
  }

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
