import { emailEventRepo, emailRepo } from "@namuh/core";
import { Hono } from "hono";

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

    console.log(`Received SES event ${eventType} for message ${sesId}`);

    // Resolve internal emailId from tags or messageId
    // Resend/SES usually includes tags in the 'mail' object if passed
    const broadcastId = sesMessage.mail.tags?.["broadcast_id"]?.[0];
    
    // For now, we assume standard SES event normalization
    const payload = sesMessage[eventType.toLowerCase()] || sesMessage;

    // Use a default system userId if not found
    const emailId = sesMessage.mail.headers?.find((h: any) => h.name === "X-Entity-ID")?.value;

    if (emailId) {
      await emailEventRepo.create({
        emailId,
        type: eventType.toLowerCase(),
        payload,
      });
    }
  }

  return c.text("OK");
});

export default app;
