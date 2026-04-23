import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { sendEmail as sesSendEmail } from "@/lib/ses";

interface BatchEmailBody {
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
}

function normalizeToArray(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

export async function POST(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  let body: BatchEmailBody[];
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return Response.json(
      { error: "Body must be an array of emails" },
      { status: 400 },
    );
  }

  if (body.length > 100) {
    return Response.json(
      { error: "Maximum 100 emails per batch request" },
      { status: 400 },
    );
  }

  try {
    // Validate all items first
    for (const item of body) {
      if (
        !item.from ||
        !item.to ||
        !item.subject ||
        (!item.html && !item.text)
      ) {
        return Response.json(
          { error: "Each email must have from, to, subject, and html or text" },
          { status: 422 },
        );
      }
    }

    // Send emails with controlled concurrency (5 at a time)
    const CONCURRENCY = 5;
    const results: Array<{ id: string }> = [];

    for (let i = 0; i < body.length; i += CONCURRENCY) {
      const chunk = body.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const to = normalizeToArray(item.to) as string[];
          const cc = normalizeToArray(item.cc);
          const bcc = normalizeToArray(item.bcc);
          const replyTo = normalizeToArray(item.reply_to);
          const scheduledAt = item.scheduled_at ? new Date(item.scheduled_at) : null;

          if (!scheduledAt) {
            await sesSendEmail({
              from: item.from,
              to,
              cc,
              bcc,
              subject: item.subject,
              html: item.html,
              text: item.text,
              replyTo,
              headers: item.headers,
              attachments: item.attachments as any,
            });
          }

          const [email] = await db
            .insert(emails)
            .values({
              from: item.from,
              to,
              cc: cc ?? [],
              bcc: bcc ?? [],
              replyTo: replyTo ?? [],
              subject: item.subject,
              html: item.html ?? "",
              text: item.text ?? "",
              tags: item.tags ?? [],
              headers: item.headers ?? {},
              attachments: (item.attachments as any) ?? [],
              status: scheduledAt ? "scheduled" : "sent",
              scheduledAt: scheduledAt,
              topicId: item.topic_id || null,
            })
            .returning({ id: emails.id });

          return { id: email.id };
        }),
      );
      results.push(...chunkResults);
    }

    return Response.json({ data: results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send batch emails";
    return Response.json({ error: message }, { status: 500 });
  }
}
