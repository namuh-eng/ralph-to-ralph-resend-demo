const SES_EVENT_TYPE_MAP: Record<string, { type: string; payloadKey: string }> =
  {
    Send: { type: "sent", payloadKey: "send" },
    Delivery: { type: "delivered", payloadKey: "delivery" },
    Bounce: { type: "bounced", payloadKey: "bounce" },
    Complaint: { type: "complained", payloadKey: "complaint" },
    DeliveryDelay: {
      type: "delivery_delayed",
      payloadKey: "deliveryDelay",
    },
    Open: { type: "opened", payloadKey: "open" },
    Click: { type: "clicked", payloadKey: "click" },
    Reject: { type: "failed", payloadKey: "reject" },
    RenderingFailure: {
      type: "failed",
      payloadKey: "failure",
    },
  };

export function normalizeSesEvent(eventType: string) {
  return SES_EVENT_TYPE_MAP[eventType] ?? null;
}
