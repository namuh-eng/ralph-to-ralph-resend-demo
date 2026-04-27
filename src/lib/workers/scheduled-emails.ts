import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { sendEmail } from "@/lib/ses";
import { and, eq, lte } from "drizzle-orm";

/**
 * processScheduledEmails
 *
 * Scans for emails with status 'scheduled' where scheduledAt is in the past.
 * Sends them via SES and updates status to 'sent'.
 *
 * Note: In a production environment, this should run in a dedicated worker process
 * or as a serverless cron job (e.g. AWS Lambda + EventBridge).
 */
export async function processScheduledEmails() {
  const now = new Date();

  // 1. Find pending scheduled emails
  const pending = await db
    .select()
    .from(emails)
    .where(and(eq(emails.status, "scheduled"), lte(emails.scheduledAt, now)))
    .limit(50); // Process in batches

  if (pending.length === 0) return { processed: 0 };

  let sentCount = 0;
  let errorCount = 0;

  for (const email of pending) {
    try {
      // 2. Perform the send
      await sendEmail({
        from: email.from,
        to: email.to as string[],
        cc: email.cc as string[],
        bcc: email.bcc as string[],
        replyTo: email.replyTo as string[],
        subject: email.subject,
        html: email.html ?? undefined,
        text: email.text ?? undefined,
        headers: email.headers as Record<string, string>,
        attachments: (email.attachments as any[])?.map((a) => ({
          filename: a.filename,
          content: a.content || "", // Simple string content for now
        })),
      });

      // 3. Mark as sent
      await db
        .update(emails)
        .set({ status: "sent" })
        .where(eq(emails.id, email.id));

      sentCount++;
    } catch (err) {
      console.error(`Failed to send scheduled email ${email.id}:`, err);
      errorCount++;
      // In the future: update status to 'failed' or increment retry count
    }
  }

  return {
    processed: pending.length,
    sent: sentCount,
    errors: errorCount,
  };
}
