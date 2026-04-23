import { createHmac } from "node:crypto";

/**
 * Signs a webhook payload using Svix-style format.
 * v1,<signature>
 */
export function signWebhookPayload(secret: string, timestamp: number, body: string): string {
  const toSign = `${timestamp}.${body}`;
  const hmac = createHmac("sha256", secret.replace("whsec_", ""));
  const signature = hmac.update(toSign).digest("base64");
  return `v1,${signature}`;
}
