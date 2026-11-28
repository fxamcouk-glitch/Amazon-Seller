import { describe, expect, it } from "vitest";
import { fulfilmentEnabled, fulfilmentIdFor, fulfilmentRequest, shipmentUpdate } from "./fulfilment";
import { fulfillableBySku } from "./stock";

const order = {
  number: 1001,
  paidAt: new Date("2026-11-28T10:00:00Z"),
  customerName: "Sam Smith",
  customerEmail: "sam@example.com",
  customerPhone: "+447700900123",
  shipLine1: "1 High Street",
  shipLine2: null,
  shipCity: "Bristol",
  shipRegion: null,
  shipPostcode: "BS1 1AA",
  shipCountry: "GB",
  items: [{ sku: "TCS-RD-3CORE-RED-10M", quantity: 2 }],
};

describe("Amazon fulfilment", () => {
  it("is on only with MCF_ENABLED=true and the live Amazon account", () => {
    expect(fulfilmentEnabled({ MCF_ENABLED: "true", SP_API_SANDBOX: "false" })).toBe(true);
    expect(fulfilmentEnabled({ MCF_ENABLED: "true" })).toBe(false); // sandbox by default
    expect(fulfilmentEnabled({ SP_API_SANDBOX: "false" })).toBe(false);
  });

  it("builds a plain-box standard order under a fixed id per website order", () => {
    const r = fulfilmentRequest(order);
    expect(fulfilmentIdFor(1001)).toBe("TCS-1001");
    expect(r).toMatchObject({
      sellerFulfillmentOrderId: "TCS-1001",
      displayableOrderId: "TCS-1001",
      displayableOrderDate: "2026-11-28T10:00:00.000Z",
      shippingSpeedCategory: "Standard",
      notificationEmails: ["sam@example.com"],
      featureConstraints: [{ featureName: "BLANK_BOX", featureFulfillmentPolicy: "Required" }],
      items: [{ sellerSku: "TCS-RD-3CORE-RED-10M", sellerFulfillmentOrderItemId: "TCS-1001-1", quantity: 2 }],
    });
    expect(r.destinationAddress).toEqual({
      name: "Sam Smith", addressLine1: "1 High Street", city: "Bristol", postalCode: "BS1 1AA", countryCode: "GB", phone: "+447700900123",
    });
  });

  it("reads Amazon's status and the tracking once shipped", () => {
    expect(shipmentUpdate({ fulfillmentOrder: { fulfillmentOrderStatus: "PROCESSING" }, fulfillmentShipments: [] })).toEqual({ amazonStatus: "PROCESSING" });
    expect(
      shipmentUpdate({
        fulfillmentOrder: { fulfillmentOrderStatus: "COMPLETE" },
        fulfillmentShipments: [
          { fulfillmentShipmentStatus: "SHIPPED", shippingDate: "2026-11-29T08:00:00Z", fulfillmentShipmentPackage: [{ trackingNumber: "RM123", carrierCode: "Royal Mail" }] },
        ],
      }),
    ).toEqual({ amazonStatus: "COMPLETE", trackingNumber: "RM123", carrier: "Royal Mail", shippedAt: new Date("2026-11-29T08:00:00Z") });
  });
});

describe("Amazon stock", () => {
  it("takes the fulfillable units per SKU", () => {
    const stock = fulfillableBySku([
      { sellerSku: "A", inventoryDetails: { fulfillableQuantity: 3 } },
      { sellerSku: "B", inventoryDetails: { fulfillableQuantity: 0 } },
      { sellerSku: "C" },
      {},
    ]);
    expect([...stock.entries()]).toEqual([["A", 3], ["B", 0], ["C", 0]]);
  });
});
