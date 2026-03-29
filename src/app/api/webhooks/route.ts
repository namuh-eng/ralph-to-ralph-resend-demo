import { randomBytes } from "node:crypto";
import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

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

  try {
    const results = await db
      .select({
        id: webhooks.id,
        endpoint: webhooks.endpoint,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .orderBy(desc(webhooks.createdAt))
      .limit(limit);

    return Response.json({
      object: "list",
      data: results.map((w) => ({
        id: w.id,
        endpoint: w.endpoint,
        events: w.events,
        active: w.active,
        created_at: w.createdAt,
      })),
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

  let body: CreateWebhookBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateCreateBody(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 422 });
  }

  try {
    const signingSecret = `whsec_${randomBytes(24).toString("hex")}`;

    const [webhook] = await db
      .insert(webhooks)
      .values({
        endpoint: body.endpoint,
        events: body.events,
        signingSecret,
      })
      .returning();

    return Response.json(
      {
        id: webhook.id,
        endpoint: webhook.endpoint,
        events: webhook.events,
        active: webhook.active,
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
