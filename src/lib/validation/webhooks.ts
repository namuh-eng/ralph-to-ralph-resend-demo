import { z } from "zod";

export const webhookStatusSchema = z.enum(["active", "disabled"]);

export const createWebhookSchema = z
  .object({
    endpoint: z.string().url().max(2048).optional(),
    url: z.string().url().max(2048).optional(),
    events: z.array(z.string()).min(1).optional(),
    event_types: z.array(z.string()).min(1).optional(),
  })
  .refine(
    (data) => (data.endpoint || data.url) && (data.events || data.event_types),
    {
      message: "Endpoint and events are required",
    },
  );

export const updateWebhookSchema = z.object({
  endpoint: z.string().url().max(2048).optional(),
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string()).min(1).optional(),
  event_types: z.array(z.string()).min(1).optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
});

export type CreateWebhookRequest = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookRequest = z.infer<typeof updateWebhookSchema>;
