import { describe, expect, it } from "vitest";
import type { Product } from "./catalogue";
import { badgeFor, lengthMetres, listingsFor, priceLadder, samePriceEveryColour, sectionsForShop } from "./storefront";

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
  it("summarises the lengths of a cable listing", () => {
    const [black] = listingsFor([black10, black3, black5]);
    expect([black.cardTitle, black.note]).toEqual(["Black Round", "3 lengths · 3 to 10 m"]);
    expect([listingsFor([holder])[0].cardTitle, listingsFor([holder])[0].note]).toEqual(["Ceramic E27 Lamp Holder, Straight", "Handmade porcelain · E27"]);
    const wall = p("CERAMIC-WALL-LIGHT-IP54", "Ceramic IP54 Wall Light, White with Frosted Glass, E27, Bathroom/Exterior", 2500);
    expect([listingsFor([wall])[0].cardTitle, listingsFor([wall])[0].note]).toEqual(["Ceramic IP54 Wall Light", "Handmade porcelain · IP54 rated"]);
  });

  it("gives the price of each length and marks the cheapest per metre", () => {
    expect(priceLadder([black10, black3, black5, twisted3, holder])).toEqual([
      { metres: 3, pricePence: 1199, perMetrePence: 400, best: false },
      { metres: 5, pricePence: 1599, perMetrePence: 320, best: false },
      { metres: 10, pricePence: 2899, perMetrePence: 290, best: true },
    ]);
    expect(priceLadder([holder])).toEqual([]);
  });

  it("badges the best-selling style", () => {
    const zz = p("TCS-RD-3CORE-BLACK/WHITE/ZZ-5M", "Black & White Zig Zag Round Fabric Lighting Flex, 3 Core 0.75mm², 5m");
    expect(badgeFor(zz)).toBe("Best seller");
    expect(badgeFor(black5)).toBeUndefined();
    expect(listingsFor([zz])[0].badge).toBe("Best seller");
  });
  it("knows when every colour costs the same at each length", () => {
    const red3 = p("TCS-RD-3CORE-RED-3M", "Red Round Fabric Lighting Flex, 3 Core 0.75mm², 3m", 1199);
    expect(samePriceEveryColour([black3, red3, black5, holder])).toBe(true);
    expect(samePriceEveryColour([black3, { ...red3, pricePence: 1099 }])).toBe(false);
  });
});
