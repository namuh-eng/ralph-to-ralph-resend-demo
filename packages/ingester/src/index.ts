import { emailEventRepo, webhookRepo } from "@namuh/core";
import { Hono } from "hono";
import { webhookDispatcher } from "./dispatcher";
import { normalizeSesEvent } from "./ses-event-normalization";

const app = new Hono();

app.get("/health", (c) => c.text("OK"));

app.post("/events/ses", async (c) => {
  const body = await c.req.json();
  const snsType = c.req.header("x-amz-sns-message-type");

  if (snsType === "SubscriptionConfirmation") {
    console.log("SNS Subscription Confirmation URL:", body.SubscribeURL);
    // In a real environment, you'd fetch this URL to confirm
    return c.text("OK");
  }

  if (snsType === "Notification") {
    const sesMessage = JSON.parse(body.Message);
    const sesId = sesMessage.mail.messageId;
    const eventType = sesMessage.eventType;
    const normalizedEvent = normalizeSesEvent(eventType);

    console.log(`Received SES event ${eventType} for message ${sesId}`);

    if (!normalizedEvent) {
      console.warn(
        `Unsupported SES event type ${eventType} for message ${sesId}`,
      );
      return c.text("OK");
    }

    // SES tags are sometimes nested in mail.tags
    const emailId = sesMessage.mail.headers?.find(
      (h: { name: string; value: string }) => h.name === "X-Entity-ID",
    )?.value;

    if (emailId) {
      const event = await emailEventRepo.create({
        emailId,
        type: normalizedEvent.type,
        payload: sesMessage[normalizedEvent.payloadKey] || sesMessage,
      });

      // Simple fan-out: dispatch to all active webhooks subscribed to this type
      const { data: hooks } = await webhookRepo.list({ limit: 100 });
      for (const hook of hooks) {
        const types = hook.eventTypes as string[];
        const webhookEventType = `email.${event.type}`;
        if (
          hook.status === "active" &&
          (types.includes("*") ||
            types.includes(event.type) ||
            types.includes(webhookEventType))
        ) {
          // Fire and forget for now in this context, or await if we want serial
          webhookDispatcher.dispatch(hook.id, event).catch((err) => {
            console.error(`Error dispatching webhook ${hook.id}:`, err);
          });
        }
      }
    }
  }

  return c.text("OK");
});

export default app;
