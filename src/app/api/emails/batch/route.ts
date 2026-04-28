import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { normalizeAttachmentsForStorage } from "@/lib/email-attachments";
import { batchSendEmailSchema } from "@/lib/validation/emails";
import { createBackgroundJob, publishBackgroundJob } from "@namuh/core";
import { eq } from "drizzle-orm";

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

          const shouldQueueNow = !scheduledAt || scheduledAt <= new Date();

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
              attachments: normalizeAttachmentsForStorage(item.attachments),
              status: shouldQueueNow ? "queued" : "scheduled",
              scheduledAt: scheduledAt,
              topicId: item.topic_id || null,
            })
            .returning({ id: emails.id });

          if (shouldQueueNow) {
            try {
              await publishBackgroundJob(
                createBackgroundJob({
                  id: `email.send:${email.id}`,
                  type: "email.send",
                  source: "api",
                  emailId: email.id,
                }),
                {
                  deduplicationId: `email.send:${email.id}`,
                  groupId: "email.send",
                },
              );
            } catch (error) {
              await db
                .update(emails)
                .set({ status: "failed" })
                .where(eq(emails.id, email.id));
              throw error;
            }
          }

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
