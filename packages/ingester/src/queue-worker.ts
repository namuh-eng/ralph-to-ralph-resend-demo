import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import {
  type BackgroundJob,
  createBackgroundJob,
  emailProvider,
  emailRepo,
  parseBackgroundJob,
  publishBackgroundJob,
} from "@namuh/core";
import { webhookDispatcher } from "./dispatcher";

const DEFAULT_MAX_MESSAGES = 5;
const DEFAULT_WAIT_TIME_SECONDS = 20;
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 60;
const DEFAULT_IDLE_SLEEP_MS = 1_000;
const MAX_SQS_DELAY_SECONDS = 900;

type QueueWorkerOptions = {
  queueUrl?: string | null;
  sqsClient?: SQSClient;
  maxMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeoutSeconds?: number;
  idleSleepMs?: number;
};

type StoredAttachment = {
  filename?: unknown;
  content?: unknown;
};

type PollResult = {
  received: number;
  processed: number;
  deleted: number;
  errors: number;
};

function getQueueUrl(): string | null {
  const value = process.env.BACKGROUND_JOBS_QUEUE_URL?.trim();
  return value ? value : null;
}

function getRegion(): string {
  return process.env.AWS_REGION?.trim() || "us-east-1";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class QueueWorker {
  private readonly queueUrl: string | null;
  private readonly sqsClient: SQSClient;
  private readonly maxMessages: number;
  private readonly waitTimeSeconds: number;
  private readonly visibilityTimeoutSeconds: number;
  private readonly idleSleepMs: number;
  private started = false;

  constructor(options: QueueWorkerOptions = {}) {
    this.queueUrl = options.queueUrl ?? getQueueUrl();
    this.sqsClient =
      options.sqsClient ?? new SQSClient({ region: getRegion() });
    this.maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
    this.waitTimeSeconds = options.waitTimeSeconds ?? DEFAULT_WAIT_TIME_SECONDS;
    this.visibilityTimeoutSeconds =
      options.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT_SECONDS;
    this.idleSleepMs = options.idleSleepMs ?? DEFAULT_IDLE_SLEEP_MS;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.pollForever().catch((error) => {
      this.started = false;
      console.error("[jobs] background worker stopped", error);
    });
  }

  async pollForever(signal?: AbortSignal): Promise<void> {
    while (!signal?.aborted) {
      const result = await this.pollOnce();
      if (result.received === 0) {
        await sleep(this.idleSleepMs);
      }
    }
  }

  async pollOnce(): Promise<PollResult> {
    if (!this.queueUrl) {
      console.info("[jobs] BACKGROUND_JOBS_QUEUE_URL missing; poll skipped");
      return { received: 0, processed: 0, deleted: 0, errors: 0 };
    }

    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.maxMessages,
        WaitTimeSeconds: this.waitTimeSeconds,
        VisibilityTimeout: this.visibilityTimeoutSeconds,
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
        MessageAttributeNames: ["All"],
      }),
    );

    const messages = response.Messages ?? [];
    const result: PollResult = {
      received: messages.length,
      processed: 0,
      deleted: 0,
      errors: 0,
    };

    for (const message of messages) {
      if (!message.Body || !message.ReceiptHandle) {
        result.errors++;
        continue;
      }

      try {
        const job = parseBackgroundJob(message.Body);
        await this.processJob(job);
        result.processed++;
        await this.sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
        result.deleted++;
      } catch (error) {
        result.errors++;
        const delaySeconds = getRetryDelaySeconds(message.Attributes);
        if (delaySeconds !== null) {
          await this.sqsClient.send(
            new ChangeMessageVisibilityCommand({
              QueueUrl: this.queueUrl,
              ReceiptHandle: message.ReceiptHandle,
              VisibilityTimeout: delaySeconds,
            }),
          );
        }
        console.error("[jobs] failed to process background job", error);
      }
    }

    return result;
  }

  async processJob(job: BackgroundJob): Promise<unknown> {
    switch (job.type) {
      case "email.send":
        return await this.processEmailSend(job.emailId);
      case "scheduled-email.scan":
        return await this.processDueScheduledEmails(job.limit);
      case "webhook.dispatch":
        return await webhookDispatcher.dispatchDelivery(job.deliveryId);
      case "webhook-delivery.scan":
        return await webhookDispatcher.dispatchPendingDeliveries({
          limit: job.limit,
        });
    }
  }

  async processDueScheduledEmails(limit = 50): Promise<{
    scanned: number;
    enqueued: number;
  }> {
    const due = await emailRepo.findDueScheduled({ limit });
    let enqueued = 0;

    for (const email of due) {
      const result = await publishBackgroundJob(
        createBackgroundJob({
          id: `email.send:${email.id}`,
          type: "email.send",
          source: "scheduled-scan",
          emailId: email.id,
        }),
        {
          deduplicationId: `email.send:${email.id}`,
          groupId: "email.send",
        },
      );

      if (result.status === "published") {
        await emailRepo.update(email.id, { status: "queued" });
        enqueued++;
      }
    }

    return { scanned: due.length, enqueued };
  }

  private async processEmailSend(emailId: string): Promise<{
    status: "sent" | "skipped";
    reason?: string;
  }> {
    const email = await emailRepo.findById(emailId);
    if (!email) return { status: "skipped", reason: "not_found" };
    if (email.status === "sent") {
      return { status: "skipped", reason: "already_sent" };
    }
    if (email.status === "cancelled" || email.status === "canceled") {
      return { status: "skipped", reason: "cancelled" };
    }
    if (email.scheduledAt && email.scheduledAt > new Date()) {
      return { status: "skipped", reason: "scheduled_for_future" };
    }

    await emailRepo.update(email.id, { status: "processing" });

    try {
      await emailProvider.sendEmail({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html ?? undefined,
        text: email.text ?? undefined,
        cc: email.cc ?? undefined,
        bcc: email.bcc ?? undefined,
        replyTo: email.replyTo ?? undefined,
        headers: email.headers ?? undefined,
        attachments: normalizeAttachmentsForSend(email.attachments),
      });

      await emailRepo.update(email.id, {
        status: "sent",
        sentAt: new Date(),
      });
      return { status: "sent" };
    } catch (error) {
      await emailRepo.update(email.id, { status: "queued" });
      throw error;
    }
  }
}

function normalizeAttachmentsForSend(
  attachments: StoredAttachment[] | null | undefined,
): Array<{ filename: string; content: string }> | undefined {
  if (!attachments) return undefined;

  const sendable = attachments.flatMap((attachment) => {
    if (
      typeof attachment.filename === "string" &&
      typeof attachment.content === "string"
    ) {
      return [{ filename: attachment.filename, content: attachment.content }];
    }
    return [];
  });

  return sendable.length > 0 ? sendable : undefined;
}

function getRetryDelaySeconds(
  attributes: Record<string, string> | undefined,
): number | null {
  const receiveCount = Number(attributes?.ApproximateReceiveCount ?? "1");
  if (!Number.isFinite(receiveCount) || receiveCount <= 1) return null;
  return Math.min(MAX_SQS_DELAY_SECONDS, 2 ** Math.min(receiveCount, 6));
}

export const queueWorker = new QueueWorker();
