import {
  type emailEvents,
  signWebhookPayload,
  webhookDeliveryRepo,
  webhookRepo,
} from "@namuh/core";

export class WebhookDispatcher {
  async dispatch(webhookId: string, event: typeof emailEvents.$inferSelect) {
    const webhook = await webhookRepo.findById(webhookId);
    if (!webhook || webhook.status !== "active") return;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const msgId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const webhookEventType = event.type.includes(".")
      ? event.type
      : `email.${event.type}`;

    const body = JSON.stringify({
      id: msgId,
      type: webhookEventType,
      created_at: new Date().toISOString(),
      data: event.payload,
    });

    const signature = signWebhookPayload(
      webhook.signingSecret || "",
      msgId,
      timestamp,
      body,
    );

    const delivery = await webhookDeliveryRepo.create({
      webhookId: webhook.id,
      eventId: event.id,
      status: "pending",
      attempt: 1,
    });

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": msgId,
          "svix-timestamp": timestamp,
          "svix-signature": signature,
        },
        body,
      });

      const responseBody = await res.text();

      await webhookDeliveryRepo.update(delivery.id, {
        statusCode: res.status,
        responseBody,
        status: res.ok ? "success" : "failed",
        attemptedAt: new Date(),
        nextRetryAt: res.ok ? null : this.calculateNextRetry(1),
      });

      return {
        statusCode: res.status,
        success: res.ok,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await webhookDeliveryRepo.update(delivery.id, {
        status: "failed",
        responseBody: message,
        attemptedAt: new Date(),
        nextRetryAt: this.calculateNextRetry(1),
      });

      return {
        success: false,
        error: message,
      };
    }
  }

  private calculateNextRetry(attempt: number): Date {
    // 10s, 1m, 5m, 30m, 2h, 6h, 24h
    const intervals = [10, 60, 300, 1800, 7200, 21600, 86400];
    const seconds = intervals[attempt - 1] || 86400;
    return new Date(Date.now() + seconds * 1000);
  }
}

export const webhookDispatcher = new WebhookDispatcher();
