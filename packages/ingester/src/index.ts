import { Hono } from "hono";
import { emailRepo } from "@namuh/core";

const app = new Hono();

app.get("/health", (c) => c.text("OK"));

app.post("/events/ses", async (c) => {
  const body = await c.req.json();
  const snsType = c.req.header("x-amz-sns-message-type");

  if (snsType === "SubscriptionConfirmation") {
    console.log("SNS Subscription Confirmation URL:", body.SubscribeURL);
    // Auto-confirm in dev
    return c.text("OK");
  }

  if (snsType === "Notification") {
    const sesEvent = JSON.parse(body.Message);
    const sesId = sesEvent.mail.messageId;
    const type = sesEvent.eventType;

    console.log(`Received SES event ${type} for message ${sesId}`);
    
    // Normalization logic will go here
  }

  return c.text("OK");
});

export default app;
