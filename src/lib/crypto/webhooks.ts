import { createHmac } from "node:crypto";

/**
 * signWebhookPayload
 *
 * Generates a Svix-compatible HMAC-SHA256 signature for a webhook payload.
 * Format: v1,<base64_signature>
 */
export function signWebhookPayload(
  secret: string,
  msgId: string,
  timestamp: string,
  payload: string,
): string {
  const toSign = `${msgId}.${timestamp}.${payload}`;
  const hmac = createHmac("sha256", secret.replace("whsec_", ""));
  const sig = hmac.update(toSign).digest("base64");
  return `v1,${sig}`;
}
