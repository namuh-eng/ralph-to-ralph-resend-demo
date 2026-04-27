import { z } from "zod";

export const contactStatusSchema = z.enum(["subscribed", "unsubscribed"]);

export const createContactSchema = z.object({
  email: z.string().email().min(3).max(512),
  first_name: z.string().max(255).optional(),
  last_name: z.string().max(255).optional(),
  unsubscribed: z.boolean().optional(),
  properties: z.record(z.string()).optional(),
  segments: z.array(z.string()).optional(),
  topics: z
    .array(
      z.union([
        z.string().uuid(),
        z.object({
          id: z.string().uuid(),
          subscription: z.enum(["opt_in", "opt_out"]),
        }),
      ]),
    )
    .optional(),
});

export const updateContactSchema = z.object({
  email: z.string().email().min(3).max(512).optional(),
  first_name: z.string().max(255).optional(),
  last_name: z.string().max(255).optional(),
  unsubscribed: z.boolean().optional(),
  properties: z.record(z.string()).optional(),
});

export type CreateContactRequest = z.infer<typeof createContactSchema>;
export type UpdateContactRequest = z.infer<typeof updateContactSchema>;
