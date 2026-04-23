import { emailRepo } from "../db/repositories/emailRepo";
import { emailProvider } from "./emailProvider";

export class EmailService {
  async send(params: {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string[];
    headers?: Record<string, string>;
    attachments?: Array<{ filename: string; content: string }>;
    tags?: Array<{ name: string; value: string }>;
    scheduledAt?: Date | null;
    topicId?: string | null;
    idempotencyKey?: string | null;
  }) {
    // Check idempotency if key provided
    if (params.idempotencyKey) {
      const existing = await emailRepo.findByIdempotencyKey(
        params.idempotencyKey,
      );
      if (existing) return { id: existing.id, duplicate: true };
    }

    // Only call SES if not scheduled for later
    let providerId: string | null = null;
    if (!params.scheduledAt) {
      const res = await emailProvider.sendEmail(params);
      providerId = res.id;
    }

    const [record] = await emailRepo.create({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html || "",
      text: params.text || "",
      cc: params.cc ?? [],
      bcc: params.bcc ?? [],
      replyTo: params.replyTo ?? [],
      headers: params.headers ?? {},
      attachments: (params.attachments as any) ?? [],
      tags: params.tags ?? [],
      status: params.scheduledAt ? "scheduled" : "sent",
      scheduledAt: params.scheduledAt,
      topicId: params.topicId,
      idempotencyKey: params.idempotencyKey,
    });

    return { id: record.id, providerId };
  }

  async sendBatch(items: any[]) {
    // Encapsulate 5-at-a-time concurrency
    const CONCURRENCY = 5;
    const results = [];
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      const chunkRes = await Promise.all(chunk.map((item) => this.send(item)));
      results.push(...chunkRes);
    }
    return results;
  }
}

export const emailService = new EmailService();
