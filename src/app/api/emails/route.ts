import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails, templates } from "@/lib/db/schema";
import {
  normalizeAttachmentsForSend,
  normalizeAttachmentsForStorage,
} from "@/lib/email-attachments";
import { sendEmail as sesSendEmail } from "@/lib/ses";
import { sendEmailSchema } from "@/lib/validation/emails";
import { desc, eq, gt, lt } from "drizzle-orm";
import { ZodError } from "zod";

// ── Helpers ───────────────────────────────────────────────────────

function normalizeToArray(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ── POST /api/emails ──────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const idempotencyKey = request.headers.get("idempotency-key");
  if (
    idempotencyKey &&
    (idempotencyKey.length < 1 || idempotencyKey.length > 255)
  ) {
    return Response.json(
      { error: "Invalid idempotency key length" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = sendEmailSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 },
    );
  }

  const validated = result.data;

  // Idempotency check
  if (idempotencyKey) {
    const existing = await db.query.emails.findFirst({
      where: eq(emails.idempotencyKey, idempotencyKey),
    });
    if (existing) {
      return Response.json({ id: existing.id }, { status: 409 });
    }
  }

  const to = normalizeToArray(validated.to) as string[];
  const cc = normalizeToArray(validated.cc);
  const bcc = normalizeToArray(validated.bcc);
  const replyTo = normalizeToArray(validated.reply_to);
  const scheduledAt = validated.scheduled_at
    ? new Date(validated.scheduled_at)
    : null;

  try {
    let finalHtml = validated.html || "";
    let finalSubject = validated.subject;

    // Handle template resolving
    if (validated.template) {
      const template = await db.query.templates.findFirst({
        where: eq(templates.id, validated.template.id),
      });
      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }

      // Validate required variables
      const templateVars =
        (template.variables as Array<{
          name: string;
          required: boolean;
        }>) ?? [];
      const requiredVars = templateVars
        .filter((v) => v.required)
        .map((v) => v.name);
      const providedVars = validated.template.variables ?? {};

      for (const requiredVar of requiredVars) {
        if (providedVars[requiredVar] === undefined) {
          return Response.json(
            {
              error: "Validation failed",
              message: `Missing required template variable: ${requiredVar}`,
            },
            { status: 422 },
          );
        }
      }

      finalHtml = template.html || "";
      if (template.subject) finalSubject = template.subject;

      // Simple variable replacement
      if (validated.template.variables) {
        for (const [key, value] of Object.entries(
          validated.template.variables,
        )) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          finalHtml = finalHtml.replace(regex, String(value));
          finalSubject = finalSubject.replace(regex, String(value));
        }
      }
    }

    // Only send immediately if not scheduled
    if (!scheduledAt) {
      await sesSendEmail({
        from: validated.from,
        to,
        cc,
        bcc,
        subject: finalSubject,
        html: finalHtml,
        text: validated.text,
        replyTo,
        headers: validated.headers as Record<string, string>,
        attachments: normalizeAttachmentsForSend(validated.attachments),
      });
    }

    // Store in DB
    const [email] = await db
      .insert(emails)
      .values({
        from: validated.from,
        to,
        cc: cc ?? [],
        bcc: bcc ?? [],
        replyTo: replyTo ?? [],
        subject: finalSubject,
        html: finalHtml,
        text: validated.text ?? "",
        tags: validated.tags ?? [],
        headers: (validated.headers as Record<string, string>) ?? {},
        attachments: normalizeAttachmentsForStorage(validated.attachments),
        status: scheduledAt ? "scheduled" : "sent",
        scheduledAt: scheduledAt,
        topicId: validated.topic_id || null,
        idempotencyKey: idempotencyKey,
        userId: auth.userId, // Link to the user who owns the API key
      })
      .returning({ id: emails.id });

    return Response.json({ id: email.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ── GET /api/emails ───────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 20, 1),
    100,
  );
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");

  try {
    let query = db
      .select({
        id: emails.id,
        from: emails.from,
        to: emails.to,
        subject: emails.subject,
        cc: emails.cc,
        bcc: emails.bcc,
        replyTo: emails.replyTo,
        status: emails.status,
        scheduledAt: emails.scheduledAt,
        createdAt: emails.createdAt,
      })
      .from(emails);

    if (after) {
      query = query.where(gt(emails.id, after)) as typeof query;
    } else if (before) {
      query = query.where(lt(emails.id, before)) as typeof query;
    }

    const results = await query
      .orderBy(desc(emails.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return Response.json({
      object: "list",
      has_more: hasMore,
      data: data.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        cc: e.cc,
        bcc: e.bcc,
        reply_to: e.replyTo,
        last_event: e.status,
        scheduled_at: e.scheduledAt,
        created_at: e.createdAt,
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list emails";
    return Response.json({ error: message }, { status: 500 });
  }
}
