import { db } from "@/lib/db";
import { emailEvents, emails, webhooks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export type SystemEventType =
  | "domain.created"
  | "domain.updated"
  | "domain.deleted"
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained";

export interface QueueEventOptions {
  type: SystemEventType;
  payload: Record<string, any>;
  emailId?: string;
}

/**
 * queueEvent
 *
 * Enqueues a system event for webhook delivery.
 */
export async function queueEvent(options: QueueEventOptions) {
  const { type, payload, emailId } = options;

  await db.transaction(async (tx) => {
    // 1. If it's an email event, log it in email_events
    let internalEventId: string | undefined;

    if (emailId) {
      const [evt] = await tx
        .insert(emailEvents)
        .values({
          emailId,
          type,
          payload,
        })
        .returning({ id: emailEvents.id });
      internalEventId = evt.id;
    }

    // 2. Scan for matching webhooks and enqueue deliveries
    // In a real implementation, we'd insert into a 'webhook_deliveries' table.
    // For now, we log the intent.
    const matchingWebhooks = await tx
      .select()
      .from(webhooks)
      .where(sql`${webhooks.eventTypes} ? ${type}`);

    for (const webhook of matchingWebhooks) {
      console.log(
        `[Event] Queuing ${type} for webhook ${webhook.id} (${webhook.url})`,
      );
      // tx.insert(webhookDeliveries).values(...)
    }
  });
}
