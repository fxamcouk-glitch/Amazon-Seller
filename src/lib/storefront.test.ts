import { describe, expect, it } from "vitest";
import type { Product } from "./catalogue";
import { lengthMetres, listingsFor, sectionsForShop } from "./storefront";

const p = (sku: string, name: string, pricePence = 1000, inStock = true): Product => ({
  sku, name, slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"), pricePence, summary: "", description: [], specs: [], inStock,
});

const black3 = p("TCS-RD-3CORE-BLACK-3M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 3m", 1199, false);
const black10 = p("TCS-RD-3CORE-BLACK-10M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 10m", 2899);
const black5 = p("TCS-RD-3CORE-BLACK-5M", "Black Round Fabric Lighting Flex, 3 Core 0.75mm², 5m", 1599);
const twisted3 = p("TCS-TW-3CORE-RED-3M", "Red Twisted Fabric Lighting Flex, 3 Core 0.75mm², 3m", 1199, false);
const holder = p("CERAMIC-E27-LAMPHOLDER-STRAIGHT", "Ceramic E27 Lamp Holder, Straight, White Wall/Ceiling Light", 2599);
const angled = p("CERAMIC-E27-LAMPHOLDER-ANGLED", "Ceramic E27 Lamp Holder, Angled, White Wall/Ceiling Light", 2599);

describe("storefront", () => {
  it("reads the length from the product name", () => {
    expect(lengthMetres("Red Round Fabric Lighting Flex, 3 Core 0.75mm², 10m")).toBe(10);
    expect(lengthMetres("Ceramic E27 Lamp Holder, Straight")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("makes one listing per colour and style, with every length as an option", () => {
    const [black, twisted] = listingsFor([black10, twisted3, black3, black5]);
    expect(black.title).toBe("Black Round Fabric Lighting Flex");
    expect(black.options).toEqual(["3m", "5m", "10m"]);
    expect(black.fromPence).toBe(1199);
    expect(black.priceVaries).toBe(true);
    expect(black.inStock).toBe(true);
    expect(black.slug).toBe(black5.slug); // opens the first length that is in stock
    expect(twisted.inStock).toBe(false); // out-of-stock styles come last
  });

  it("keeps each lamp holder style as its own listing", () => {
    expect(listingsFor([holder, angled]).map((l) => [l.title, l.options])).toEqual([
      ["Ceramic E27 Lamp Holder, Angled, White Wall/Ceiling Light", []],
      ["Ceramic E27 Lamp Holder, Straight, White Wall/Ceiling Light", []],
    ]);
  });

  it("splits cables from ceramic lights and drops empty sections", () => {
    expect(sectionsForShop([black5, holder]).map((s) => [s.id, s.listings.length])).toEqual([["fabric-lighting-cable", 1], ["ceramic-lights", 1]]);
    expect(sectionsForShop([holder]).map((s) => s.id)).toEqual(["ceramic-lights"]);
  });
});
