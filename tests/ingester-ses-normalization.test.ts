import { describe, expect, it } from "vitest";
import { normalizeSesEvent } from "../packages/ingester/src/ses-event-normalization";

describe("SES event normalization", () => {
  it("maps Delivery to the delivered app event taxonomy", () => {
    expect(normalizeSesEvent("Delivery")).toEqual({
      type: "delivered",
      payloadKey: "delivery",
    });
  });

  it("maps Complaint to the complained app event taxonomy", () => {
    expect(normalizeSesEvent("Complaint")).toEqual({
      type: "complained",
      payloadKey: "complaint",
    });
  });

  it("maps multiword SES events to their payload keys", () => {
    expect(normalizeSesEvent("DeliveryDelay")).toEqual({
      type: "delivery_delayed",
      payloadKey: "deliveryDelay",
    });
  });
});
