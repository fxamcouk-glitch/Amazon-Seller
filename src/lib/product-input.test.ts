import { describe, expect, it } from "vitest";
import type { ProductRecord } from "./catalogue";
import { parseProductInput, seoWarnings } from "./product-input";
import { paragraphsToText, penceToPounds, poundsToPence, slugify, specsToText, textToParagraphs, textToSpecs } from "./product-form-utils";

const good: ProductRecord = {
  sku: "TCS-RD-3-RED-10M",
  name: "Fabric braided 3-core cable, red, 10m",
  displayName: "Red Braided Fabric Cable, 3 Core, 10m",
  slug: "red-braided-fabric-cable-3-core-10m",
  pricePence: 2499,
  costPence: 1100,
  summary: "Three core fabric braided lighting flex in red, 10 metres long, for lamp rewires and pendant lights.",
  description: ["A woven textile sleeve over three core flex."],
  specs: [{ label: "Length", value: "10 metres" }],
  inStock: true,
  published: true,
  image: "/images/red-10m.jpg",
  imageAlt: "Red braided fabric cable on a white background",
};

const parse = (over: Partial<Record<keyof ProductRecord, unknown>> = {}, urlSku?: string) =>
  parseProductInput({ ...good, ...over }, urlSku);

describe("parseProductInput", () => {
  it("accepts a complete product", () => {
    expect(parse()).toMatchObject({ ok: true, record: { sku: good.sku, slug: good.slug, pricePence: 2499 } });
  });

  it("will not publish without a web address, price, summary or name", () => {
    expect(parse({ slug: null })).toMatchObject({ ok: false, error: expect.stringContaining("web address") });
    expect(parse({ slug: "" })).toMatchObject({ ok: false });
    expect(parse({ pricePence: 0 })).toMatchObject({ ok: false, error: expect.stringContaining("price") });
    expect(parse({ summary: "" })).toMatchObject({ ok: false, error: expect.stringContaining("summary") });
    expect(parse({ displayName: "", name: "x" })).toMatchObject({ ok: true });
  });

  it("lets an unfinished product be saved as a draft", () => {
    expect(parse({ published: false, slug: null, pricePence: 0, summary: "", image: "" })).toMatchObject({
      ok: true,
      record: { slug: null, image: null, published: false },
    });
  });

  it("tidies the web address and rejects unsafe ones", () => {
    expect(parse({ slug: "  Red-Cable-10M " })).toMatchObject({ ok: true, record: { slug: "red-cable-10m" } });
    for (const bad of ["red cable", "red_cable", "-red", "red--cable", "../admin", "red/cable"]) {
      expect(parse({ slug: bad }).ok).toBe(false);
    }
  });

  it("only allows safe image addresses", () => {
    expect(parse({ image: "https://example.com/a.jpg" }).ok).toBe(true);
    expect(parse({ image: "/images/a.jpg" }).ok).toBe(true);
    for (const bad of ["javascript:alert(1)", "http://example.com/a.jpg", "data:image/png;base64,AAAA", "images/a.jpg", "//evil.com/a.jpg"]) {
      expect(parse({ image: bad }).ok).toBe(false);
    }
  });

  it("accepts an uploaded photo's address and limits the image description", () => {
    expect(parse({ image: "/media/ckabc123def456.webp" }).ok).toBe(true);
    expect(parse({ imageAlt: "x".repeat(201) }).ok).toBe(false);
    expect(parse({ imageAlt: "  A red cable  " })).toMatchObject({ ok: true, record: { imageAlt: "A red cable" } });
  });

  it("rejects bad SKUs, fractional or negative prices, and a SKU that differs from the address", () => {
    expect(parse({ sku: "a/b" }).ok).toBe(false);
    expect(parse({ pricePence: 12.5 }).ok).toBe(false);
    expect(parse({ pricePence: -1 }).ok).toBe(false);
    expect(parse({}, "OTHER")).toMatchObject({ ok: false, error: expect.stringContaining("SKU") });
    expect(parse({}, good.sku).ok).toBe(true);
  });

  it("rejects malformed bodies", () => {
    expect(parseProductInput(null).ok).toBe(false);
    expect(parseProductInput({ sku: "X" }).ok).toBe(false);
  });
});

describe("seoWarnings", () => {
  it("is quiet for a good product", () => {
    expect(seoWarnings(good)).toEqual([]);
  });

  it("flags a long title, long or short summary and a missing image", () => {
    const w = seoWarnings({ name: "x", displayName: "Very long product name ".repeat(5), summary: "short", image: null }).join(" ");
    expect(w).toContain("shop name is");
    expect(w).toContain("summary is short");
    expect(w).toContain("No image");
    expect(seoWarnings({ ...good, imageAlt: "" }).join(" ")).toContain("Describe the image");
    expect(seoWarnings({ ...good, summary: "x".repeat(170) }).join(" ")).toContain("cut near 160");
  });
});

describe("form helpers", () => {
  it("converts pounds to pence exactly", () => {
    expect(poundsToPence("12.99")).toBe(1299);
    expect(poundsToPence("£5")).toBe(500);
    expect(poundsToPence("0.5")).toBe(50);
    expect(poundsToPence("19.90")).toBe(1990);
    expect(poundsToPence("0.07")).toBe(7);
    for (const bad of ["", "abc", "12.999", "-3", "1,299", "1.2.3"]) expect(poundsToPence(bad)).toBeNull();
    expect(penceToPounds(1299)).toBe("12.99");
  });

  it("round-trips paragraphs and specs", () => {
    expect(textToParagraphs("One  line\nstill one\n\n\nTwo\n\n")).toEqual(["One line still one", "Two"]);
    expect(textToParagraphs(paragraphsToText(["A", "B"]))).toEqual(["A", "B"]);
    const specs = [{ label: "Length", value: "10 metres" }, { label: "Colour", value: "Red: dark" }];
    expect(textToSpecs(specsToText(specs))).toEqual(specs);
    expect(textToSpecs("no colon here\n: empty label\nLabel:\nOK: yes")).toEqual([{ label: "OK", value: "yes" }]);
  });

  it("makes web addresses from names", () => {
    expect(slugify("Black Braided Fabric Cable, 3 Core 0.75mm, 3m")).toBe("black-braided-fabric-cable-3-core-0-75mm-3m");
    expect(slugify("  Café — Crème!! ")).toBe("cafe-creme");
    expect(slugify("x".repeat(150)).length).toBeLessThanOrEqual(100);
    expect(slugify("***")).toBe("");
  });
});
