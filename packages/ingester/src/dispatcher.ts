import { signWebhookPayload } from "@namuh/core";

export class WebhookDispatcher {
  async dispatch(webhook: any, event: any) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const msgId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const body = JSON.stringify({
      type: event.type,
      created_at: new Date().toISOString(),
      data: event.payload,
    });

    const signature = signWebhookPayload(
      webhook.signingSecret,
      msgId,
      timestamp,
      body,
    );

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

    return {
      statusCode: res.status,
      success: res.ok,
    };
  }
}

export const webhookDispatcher = new WebhookDispatcher();
