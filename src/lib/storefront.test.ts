import { describe, expect, it } from "vitest";
import type { Product } from "./catalogue";
import { groupForShop, lengthMetres, sortForShop } from "./storefront";

const p = (sku: string, name: string, inStock = true): Product => ({
  sku, name, slug: sku.toLowerCase(), pricePence: 1000, summary: "", description: [], specs: [], inStock,
});

describe("storefront", () => {
  it("reads the length from the product name", () => {
    expect(lengthMetres("Red Round Fabric Lighting Flex, 3 Core 0.75mm², 10m")).toBe(10);
    expect(lengthMetres("Ceramic E27 Lamp Holder, Straight")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("puts in-stock items first, then colour, then shortest length", () => {
    const sorted = sortForShop([
      p("A", "Red Round Fabric Lighting Flex, 3 Core 0.75mm², 10m"),
      p("B", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 50m", false),
      p("C", "Red Round Fabric Lighting Flex, 3 Core 0.75mm², 3m"),
      p("D", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 5m"),
    ]);
    expect(sorted.map((x) => x.sku)).toEqual(["D", "C", "A", "B"]);
  });

  it("splits cables from ceramic lights and drops empty groups", () => {
    const groups = groupForShop([
      p("TCS-RD-3CORE-RED-3M", "Red Round Fabric Lighting Flex, 3 Core 0.75mm², 3m"),
      p("CERAMIC-E27-LAMPHOLDER-STRAIGHT", "Ceramic E27 Lamp Holder, Straight"),
    ]);
    expect(groups.map((g) => [g.id, g.products.length])).toEqual([["fabric-lighting-cable", 1], ["ceramic-lights", 1]]);
    expect(groupForShop([p("CERAMIC-X", "Ceramic X")]).map((g) => g.id)).toEqual(["ceramic-lights"]);
  });
});
