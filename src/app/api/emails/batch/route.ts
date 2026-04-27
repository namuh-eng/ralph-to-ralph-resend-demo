import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { sendEmail as sesSendEmail } from "@/lib/ses";
import { batchSendEmailSchema } from "@/lib/validation/emails";

// ── Helpers ───────────────────────────────────────────────────────

function normalizeToArray(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ── POST /api/emails/batch ────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = batchSendEmailSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 },
    );
  }

  const validatedItems = result.data;

  try {
    // Send emails with controlled concurrency (5 at a time)
    const CONCURRENCY = 5;
    const results: Array<{ id: string }> = [];

    for (let i = 0; i < validatedItems.length; i += CONCURRENCY) {
      const chunk = validatedItems.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const to = normalizeToArray(item.to) as string[];
          const cc = normalizeToArray(item.cc);
          const bcc = normalizeToArray(item.bcc);
          const replyTo = normalizeToArray(item.reply_to);
          const scheduledAt = item.scheduled_at
            ? new Date(item.scheduled_at)
            : null;

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
              headers: item.headers as Record<string, string>,
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
              headers: (item.headers as Record<string, string>) ?? {},
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
