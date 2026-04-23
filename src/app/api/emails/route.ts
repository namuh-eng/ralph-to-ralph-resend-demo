import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails, templates } from "@/lib/db/schema";
import { sendEmail as sesSendEmail } from "@/lib/ses";
import { desc, eq, gt, lt } from "drizzle-orm";

// ── Validation ────────────────────────────────────────────────────

interface SendEmailBody {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    content_type?: string;
    content_id?: string;
  }>;
  tags?: Array<{ name: string; value: string }>;
  scheduled_at?: string;
  topic_id?: string;
  template?: {
    id: string;
    variables?: Record<string, any>;
  };
}

function normalizeToArray(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

function validateSendBody(body: SendEmailBody): string | null {
  if (!body.from) return "from is required";
  if (!body.to) return "to is required";
  if (!body.subject) return "subject is required";
  if (!body.html && !body.text && !body.template) return "html, text, or template is required";
  return null;
}

// ── POST /api/emails ──────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey && (idempotencyKey.length < 1 || idempotencyKey.length > 255)) {
    return Response.json({ error: "Invalid idempotency key length" }, { status: 400 });
  }

  let body: SendEmailBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateSendBody(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 422 });
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = await db.query.emails.findFirst({
      where: eq(emails.idempotencyKey, idempotencyKey),
    });
    if (existing) {
      return Response.json({ id: existing.id }, { status: 409 });
    }
  }

  const to = normalizeToArray(body.to) as string[];
  const cc = normalizeToArray(body.cc);
  const bcc = normalizeToArray(body.bcc);
  const replyTo = normalizeToArray(body.reply_to);
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;

  try {
    let finalHtml = body.html || "";
    let finalSubject = body.subject;

    // Handle template resolving
    if (body.template) {
      const template = await db.query.templates.findFirst({
        where: eq(templates.id, body.template.id),
      });
      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }
      
      finalHtml = template.html || "";
      if (template.subject) finalSubject = template.subject;

      // Simple variable replacement
      if (body.template.variables) {
        for (const [key, value] of Object.entries(body.template.variables)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          finalHtml = finalHtml.replace(regex, String(value));
          finalSubject = finalSubject.replace(regex, String(value));
        }
      }
    }

    // Only send immediately if not scheduled
    if (!scheduledAt) {
      await sesSendEmail({
        from: body.from,
        to,
        cc,
        bcc,
        subject: finalSubject,
        html: finalHtml,
        text: body.text,
        replyTo,
        headers: body.headers,
        attachments: body.attachments as any,
      });
    }

    // Store in DB
    const [email] = await db
      .insert(emails)
      .values({
        from: body.from,
        to,
        cc: cc ?? [],
        bcc: bcc ?? [],
        replyTo: replyTo ?? [],
        subject: finalSubject,
        html: finalHtml,
        text: body.text ?? "",
        tags: body.tags ?? [],
        headers: body.headers ?? {},
        attachments: (body.attachments as any) ?? [],
        status: scheduledAt ? "scheduled" : "sent",
        scheduledAt: scheduledAt,
        topicId: body.topic_id || null,
        idempotencyKey: idempotencyKey,
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
