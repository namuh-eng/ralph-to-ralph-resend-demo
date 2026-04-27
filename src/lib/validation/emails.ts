import { z } from "zod";

// ── Common Fragments ──────────────────────────────────────────────

export const emailAddressSchema = z.string().email().min(3).max(512);

export const emailRecipientSchema = z.union([
  emailAddressSchema,
  z.array(emailAddressSchema),
]);

export const tagSchema = z.object({
  name: z.string().min(1).max(255),
  value: z.string().max(1024),
});

export const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().optional(),
  path: z.string().url().optional(),
  content_type: z.string().optional(),
  content_id: z.string().optional(),
});

// ── Email Request Schemas ──────────────────────────────────────────

export const sendEmailSchema = z
  .object({
    from: emailAddressSchema,
    to: emailRecipientSchema,
    subject: z.string().min(1).max(1024),
    html: z.string().optional(),
    text: z.string().optional(),
    cc: emailRecipientSchema.optional(),
    bcc: emailRecipientSchema.optional(),
    reply_to: emailRecipientSchema.optional(),
    headers: z.record(z.string(), z.string()).optional(),
    attachments: z.array(attachmentSchema).optional(),
    tags: z.array(tagSchema).optional(),
    scheduled_at: z.string().optional(),
    topic_id: z.string().uuid().optional(),
    template: z
      .object({
        id: z.string().uuid(),
        variables: z.record(z.string(), z.any()).optional(),
      })
      .optional(),
  })
  .refine((data) => data.html || data.text || data.template, {
    message: "html, text, or template is required",
    path: ["html"],
  });

export const batchSendEmailSchema = z.array(sendEmailSchema).max(100);

export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type BatchSendEmailRequest = z.infer<typeof batchSendEmailSchema>;
