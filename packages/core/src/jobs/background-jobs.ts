import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const MAX_SQS_DELAY_SECONDS = 900;
const BACKGROUND_JOB_EVENT_SOURCE = "namuh-send.background-jobs";

export type BackgroundJobType =
  | "email.send"
  | "scheduled-email.scan"
  | "webhook.dispatch"
  | "webhook-delivery.scan";

export type BackgroundJobSource =
  | "api"
  | "eventbridge"
  | "manual"
  | "retry"
  | "scheduled-scan"
  | "ses-ingest";

interface BaseBackgroundJob {
  id: string;
  type: BackgroundJobType;
  requestedAt: string;
  source: BackgroundJobSource;
  attempt?: number;
}

export interface EmailSendJob extends BaseBackgroundJob {
  type: "email.send";
  emailId: string;
}

export interface ScheduledEmailScanJob extends BaseBackgroundJob {
  type: "scheduled-email.scan";
  limit?: number;
}

export interface WebhookDispatchJob extends BaseBackgroundJob {
  type: "webhook.dispatch";
  deliveryId: string;
}

export interface WebhookDeliveryScanJob extends BaseBackgroundJob {
  type: "webhook-delivery.scan";
  limit?: number;
}

export type BackgroundJob =
  | EmailSendJob
  | ScheduledEmailScanJob
  | WebhookDispatchJob
  | WebhookDeliveryScanJob;

export type BackgroundJobInput =
  | (Omit<EmailSendJob, "requestedAt"> & { requestedAt?: string })
  | (Omit<ScheduledEmailScanJob, "requestedAt"> & { requestedAt?: string })
  | (Omit<WebhookDispatchJob, "requestedAt"> & { requestedAt?: string })
  | (Omit<WebhookDeliveryScanJob, "requestedAt"> & { requestedAt?: string });

export interface PublishBackgroundJobOptions {
  delaySeconds?: number;
  deduplicationId?: string;
  groupId?: string;
  requireQueue?: boolean;
}

export type PublishBackgroundJobResult =
  | {
      status: "published";
      messageId: string | null;
      eventId: string | null;
    }
  | {
      status: "skipped";
      reason: "queue_url_missing";
    };

let sqsClient: SQSClient | null = null;
let eventBridgeClient: EventBridgeClient | null = null;

function getRegion(): string {
  return process.env.AWS_REGION?.trim() || "us-east-1";
}

function getQueueUrl(): string | null {
  const value = process.env.BACKGROUND_JOBS_QUEUE_URL?.trim();
  return value ? value : null;
}

function getEventBusName(): string | null {
  const value = process.env.BACKGROUND_JOBS_EVENT_BUS_NAME?.trim();
  return value ? value : null;
}

function requiresQueue(options: PublishBackgroundJobOptions): boolean {
  return (
    options.requireQueue === true ||
    process.env.BACKGROUND_JOBS_REQUIRE_QUEUE === "true"
  );
}

function getSqsClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: getRegion() });
  }
  return sqsClient;
}

function getEventBridgeClient(): EventBridgeClient {
  if (!eventBridgeClient) {
    eventBridgeClient = new EventBridgeClient({ region: getRegion() });
  }
  return eventBridgeClient;
}

function sanitizeDelaySeconds(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(MAX_SQS_DELAY_SECONDS, Math.floor(value)));
}

function isFifoQueue(queueUrl: string): boolean {
  return queueUrl.endsWith(".fifo");
}

export function createBackgroundJob(job: BackgroundJobInput): BackgroundJob {
  return {
    ...job,
    requestedAt: job.requestedAt ?? new Date().toISOString(),
  } as BackgroundJob;
}

export function isBackgroundJobQueueConfigured(): boolean {
  return getQueueUrl() !== null;
}

export async function publishBackgroundJob(
  job: BackgroundJob,
  options: PublishBackgroundJobOptions = {},
): Promise<PublishBackgroundJobResult> {
  const queueUrl = getQueueUrl();

  if (!queueUrl) {
    if (requiresQueue(options)) {
      throw new Error("BACKGROUND_JOBS_QUEUE_URL is required to publish jobs");
    }
    console.info("[jobs] queue URL missing; skipping background job publish", {
      jobId: job.id,
      jobType: job.type,
    });
    return { status: "skipped", reason: "queue_url_missing" };
  }

  const fifo = isFifoQueue(queueUrl);
  const message = await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(job),
      DelaySeconds: sanitizeDelaySeconds(options.delaySeconds),
      MessageAttributes: {
        jobId: { DataType: "String", StringValue: job.id },
        jobType: { DataType: "String", StringValue: job.type },
        source: { DataType: "String", StringValue: job.source },
      },
      ...(fifo
        ? {
            MessageDeduplicationId: options.deduplicationId ?? job.id,
            MessageGroupId: options.groupId ?? job.type,
          }
        : {}),
    }),
  );

  const eventId = await publishBackgroundJobEvent(job, message.MessageId);

  return {
    status: "published",
    messageId: message.MessageId ?? null,
    eventId,
  };
}

async function publishBackgroundJobEvent(
  job: BackgroundJob,
  messageId: string | undefined,
): Promise<string | null> {
  const eventBusName = getEventBusName();
  if (!eventBusName) return null;

  try {
    const result = await getEventBridgeClient().send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: eventBusName,
            Source: BACKGROUND_JOB_EVENT_SOURCE,
            DetailType: job.type,
            Detail: JSON.stringify({ job, messageId }),
          },
        ],
      }),
    );
    return result.Entries?.[0]?.EventId ?? null;
  } catch (error) {
    console.warn("[jobs] failed to publish EventBridge job event", {
      jobId: job.id,
      jobType: job.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function parseBackgroundJob(raw: string): BackgroundJob {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Background job payload must be an object");
  }

  const id = getRequiredString(parsed, "id");
  const type = getRequiredString(parsed, "type") as BackgroundJobType;
  const requestedAt = getRequiredString(parsed, "requestedAt");
  const source = getRequiredString(parsed, "source") as BackgroundJobSource;
  const attempt = getOptionalNumber(parsed, "attempt");

  switch (type) {
    case "email.send":
      return {
        id,
        type,
        requestedAt,
        source,
        ...(attempt !== undefined ? { attempt } : {}),
        emailId: getRequiredString(parsed, "emailId"),
      };
    case "scheduled-email.scan":
      return {
        id,
        type,
        requestedAt,
        source,
        ...(attempt !== undefined ? { attempt } : {}),
        ...optionalLimit(parsed),
      };
    case "webhook.dispatch":
      return {
        id,
        type,
        requestedAt,
        source,
        ...(attempt !== undefined ? { attempt } : {}),
        deliveryId: getRequiredString(parsed, "deliveryId"),
      };
    case "webhook-delivery.scan":
      return {
        id,
        type,
        requestedAt,
        source,
        ...(attempt !== undefined ? { attempt } : {}),
        ...optionalLimit(parsed),
      };
    default:
      throw new Error(`Unsupported background job type: ${type}`);
  }
}

function optionalLimit(value: Record<string, unknown>): { limit?: number } {
  const limit = getOptionalNumber(value, "limit");
  return limit === undefined ? {} : { limit };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredString(
  value: Record<string, unknown>,
  key: string,
): string {
  const field = value[key];
  if (typeof field !== "string" || field.length === 0) {
    throw new Error(`Background job field ${key} must be a non-empty string`);
  }
  return field;
}

function getOptionalNumber(
  value: Record<string, unknown>,
  key: string,
): number | undefined {
  const field = value[key];
  if (field === undefined) return undefined;
  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new Error(`Background job field ${key} must be a finite number`);
  }
  return field;
}
