import {
  createBackgroundJob,
  emailEventRepo,
  publishBackgroundJob,
  webhookRepo,
} from "@namuh/core";
import { Hono } from "hono";
import { webhookDispatcher } from "./dispatcher";
import { queueWorker } from "./queue-worker";
import { normalizeSesEvent } from "./ses-event-normalization";
import {
  SnsValidationError,
  extractEmailId,
  parseSesNotification,
  parseSnsEnvelope,
  verifySnsSignature,
} from "./sns-message";

const app = new Hono();

function isAuthorizedJobRequest(authHeader: string | undefined): boolean {
  const token = process.env.INGESTER_JOB_TOKEN?.trim();
  if (!token) return true;
  return authHeader === `Bearer ${token}`;
}

async function runJobEndpoint<T>(
  c: {
    req: { header: (name: string) => string | undefined };
    json: (data: T, status?: number) => Response;
    text: (body: string, status?: number) => Response;
  },
  action: () => Promise<T>,
) {
  if (!isAuthorizedJobRequest(c.req.header("authorization"))) {
    return c.text("Unauthorized", 401);
  }
  return c.json(await action());
}

app.get("/health", (c) => c.text("OK"));

app.post("/jobs/poll", async (c) =>
  runJobEndpoint(c, async () => await queueWorker.pollOnce()),
);

app.post("/jobs/scheduled-emails", async (c) =>
  runJobEndpoint(c, async () => await queueWorker.processDueScheduledEmails()),
);

app.post("/jobs/webhooks", async (c) =>
  runJobEndpoint(
    c,
    async () => await webhookDispatcher.dispatchPendingDeliveries(),
  ),
);

app.post("/events/ses", async (c) => {
  try {
    const body = await c.req.json();
    const snsType = c.req.header("x-amz-sns-message-type");
    const snsMessage = parseSnsEnvelope(body, snsType);

    await verifySnsSignature(snsMessage);

    if (snsMessage.Type === "SubscriptionConfirmation") {
      console.log(
        "SNS Subscription Confirmation URL:",
        snsMessage.SubscribeURL,
      );
      return c.text("OK");
    }

    if (snsMessage.Type === "UnsubscribeConfirmation") {
      console.warn("Received SNS UnsubscribeConfirmation for SES endpoint");
      return c.text("OK");
    }

    const sesMessage = parseSesNotification(snsMessage.Message);
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

    const emailId = extractEmailId(sesMessage);

    if (!emailId) {
      console.warn(
        `Skipping SES event ${eventType} for ${sesId}: missing X-Entity-ID`,
      );
      return c.text("OK");
    }

    const { event, created } = await emailEventRepo.createOrIgnoreDuplicate({
      emailId,
      sourceId: snsMessage.MessageId,
      type: normalizedEvent.type,
      payload: sesMessage[normalizedEvent.payloadKey] || sesMessage,
    });

    if (!created) {
      console.log(`Ignoring duplicate SNS message ${snsMessage.MessageId}`);
      return c.text("OK");
    }

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
        const delivery = await webhookDispatcher.enqueue(hook.id, event.id);
        await publishBackgroundJob(
          createBackgroundJob({
            id: `webhook.dispatch:${delivery.id}`,
            type: "webhook.dispatch",
            source: "ses-ingest",
            deliveryId: delivery.id,
          }),
          {
            deduplicationId: `webhook.dispatch:${delivery.id}`,
            groupId: "webhook.dispatch",
          },
        );
      }
    }

    return c.text("OK");
  } catch (error) {
    if (error instanceof SnsValidationError) {
      console.warn(error.message);
      return new Response(error.message, { status: error.status });
    }

    console.error("Unhandled SES ingestion error", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

export default app;
