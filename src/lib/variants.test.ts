import { describe, expect, it } from "vitest";
import type { Product } from "./catalogue";
import { colourLabel, variantsFor } from "./variants";

const cable = (sku: string, name: string, inStock = true): Product => ({
  sku, name, slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"), pricePence: 1000, summary: "", description: [], specs: [], inStock,
});
const black3 = cable("TCS-RD-3CORE-BLACK-3M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 3m");
const black5 = cable("TCS-RD-3CORE-BLACK-5M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 5m", false);
const red3 = cable("TCS-RD-3CORE-RED-3M", "Red Round Fabric Lighting Flex, 3 Core 0.75mm², 3m");
const twisted10 = cable("TCS-TW-3CORE-RED-10M", "Red Twisted Fabric Lighting Flex, 3 Core 0.75mm², 10m");
const holder = cable("CERAMIC-E27-LAMPHOLDER-STRAIGHT", "Ceramic E27 Lamp Holder, Straight");
const all = [black5, red3, holder, black3, twisted10];

describe("variants", () => {
  it("reads the colour label from the name", () => {
    expect(colourLabel("Black & White Zig Zag Round Fabric Lighting Flex, 3 Core 0.75mm², 5m")).toBe("Black & White Zig Zag Round");
  });

  it("lists other lengths of the same colour, shortest first", () => {
    const v = variantsFor(black3, all);
    expect(v.lengths.map((o) => [o.label, o.current, o.inStock])).toEqual([["3m", true, true], ["5m", false, false]]);
  });

  it("lists colours at the same length, or the nearest length when missing", () => {
    const v = variantsFor(black3, all);
    expect(v.colours.map((o) => [o.label, o.slug, o.current])).toEqual([
      ["Black Round", black3.slug, true],
      ["Red Round", red3.slug, false],
      ["Red Twisted", twisted10.slug, false],
    ]);
  });

  it("gives no options for products outside the cable range or with a single choice", () => {
    expect(variantsFor(holder, all)).toEqual({ lengths: [], colours: [] });
    expect(variantsFor(twisted10, [twisted10]).lengths).toEqual([]);
  });
});
