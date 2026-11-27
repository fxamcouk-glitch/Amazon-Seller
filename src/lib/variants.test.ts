import { describe, expect, it } from "vitest";
import type { Product } from "./catalogue";
import { colourLabel, familyOf, variantsFor } from "./variants";

const item = (sku: string, name: string, inStock = true, pricePence = 1199): Product => ({
  sku, name, slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"), pricePence, summary: "", description: [], specs: [], inStock,
});
const black3 = item("TCS-RD-3CORE-BLACK-3M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 3m");
const black5 = item("TCS-RD-3CORE-BLACK-5M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 5m", false, 1599);
const red3 = item("TCS-RD-3CORE-RED-3M", "Red Round Fabric Lighting Flex, 3 Core 0.75mm², 3m");
const twisted10 = item("TCS-TW-3CORE-RED-10M", "Red Twisted Fabric Lighting Flex, 3 Core 0.75mm², 10m");
const straight = item("CERAMIC-E27-LAMPHOLDER-STRAIGHT", "Ceramic E27 Lamp Holder, Straight, White Wall/Ceiling Light");
const rightAngle = item("CERAMIC-E27-LAMPHOLDER-RIGHTANGLED", "Ceramic E27 Lamp Holder, Right Angle, White Wall/Ceiling Light");
const wall = item("CERAMIC-WALL-LIGHT-IP54", "Ceramic IP54 Wall Light, White with Frosted Glass, E27, Bathroom/Exterior");
const all = [black5, red3, straight, black3, twisted10, rightAngle, wall];

describe("variants", () => {
  it("reads the colour label from the name", () => {
    expect(colourLabel("Black & White Zig Zag Round Fabric Lighting Flex, 3 Core 0.75mm², 5m")).toBe("Black & White Zig Zag Round");
  });

  it("groups cables by colour and style, red round and red twisted separately", () => {
    expect(familyOf(red3).key).not.toBe(familyOf(twisted10).key);
    expect(familyOf(black3).key).toBe(familyOf(black5).key);
  });

  it("lists every length of the style with price, price per metre and best value", () => {
    const v = variantsFor(black3, all);
    expect(v.lengths.map((o) => [o.label, o.current, o.inStock, o.pricePence, o.perMetrePence, o.best])).toEqual([
      ["3m", true, true, 1199, 400, false],
      ["5m", false, false, 1599, 320, true],
    ]);
  });

  it("lists colours at the same length, or the nearest length when missing", () => {
    expect(variantsFor(black3, all).colours.map((o) => [o.label, o.slug, o.current])).toEqual([
      ["Black Round", black3.slug, true],
      ["Red Round", red3.slug, false],
      ["Red Twisted", twisted10.slug, false],
    ]);
  });

  it("marks a colour unavailable only when every length is out of stock", () => {
    const blackOut = { ...black3, inStock: false };
    const v = variantsFor(red3, [blackOut, black5, red3]);
    expect(v.colours.map((o) => [o.label, o.available])).toEqual([["Black Round", false], ["Red Round", true]]);
    expect(variantsFor(red3, all).colours.find((o) => o.label === "Black Round")?.available).toBe(true);
  });

  it("links the lamp holder styles to each other in a fixed order", () => {
    const v = variantsFor(rightAngle, all);
    expect(v.styles.map((o) => [o.label, o.current])).toEqual([["Straight", false], ["Right Angle", true]]);
    expect(v.lengths).toEqual([]);
  });

  it("gives no options for a product with no family", () => {
    expect(variantsFor(wall, all)).toEqual({ lengths: [], colours: [], styles: [] });
  });
});
