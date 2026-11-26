import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { STOP_PATTERN, barRuns, code128Modules } from "./code128";
import { LABEL_HEIGHT_PT, LABEL_WIDTH_PT, buildLabelPdf, isValidFnsku, validateItems } from "./pdf";

const item = { fnsku: "B0CWLR1FNY", sku: "TCS-RD-3-RED-10M", copies: 3 };

describe("code128Modules", () => {
  it("starts with a start code, ends with the stop pattern, and is 11 modules per symbol", () => {
    const m = code128Modules("B0CWLR1FNY");
    expect(m.endsWith(STOP_PATTERN)).toBe(true);
    expect(m.startsWith("11010")).toBe(true); // start code B or C begins 11010...
    // start + 10 data symbols + check digit = 12 symbols of 11 modules, plus the 13-module stop
    expect(m.length).toBe(12 * 11 + 13);
    expect(m[0]).toBe("1");
  });

  it("changes when the text changes", () => {
    expect(code128Modules("B0CWLR1FNY")).not.toBe(code128Modules("B0CWLR1FNZ"));
  });
});

describe("barRuns", () => {
  it("merges adjacent bars and reports starts and lengths", () => {
    expect(barRuns("0110100111")).toEqual([
      { start: 1, length: 2 },
      { start: 4, length: 1 },
      { start: 7, length: 3 },
    ]);
  });
});

describe("validateItems", () => {
  it("accepts a good item", () => {
    expect(validateItems([item])).toBeNull();
  });

  it("rejects bad FNSKUs and copy counts", () => {
    expect(validateItems([{ ...item, fnsku: "short" }])).toContain("FNSKU");
    expect(validateItems([{ ...item, fnsku: "b0cwlr1fny" }])).toContain("FNSKU");
    expect(validateItems([{ ...item, copies: 0 }])).toContain("Copies");
    expect(validateItems([{ ...item, copies: 1.5 }])).toContain("Copies");
    expect(validateItems([{ ...item, copies: 501 }])).toContain("Copies");
    expect(validateItems([])).toContain("at least one");
  });

  it("limits the total per print", () => {
    const many = Array.from({ length: 3 }, () => ({ ...item, copies: 400 }));
    expect(validateItems(many)).toContain("limit");
  });
});

describe("isValidFnsku", () => {
  it("wants ten capital letters and numbers", () => {
    expect(isValidFnsku("X001ABCDE9")).toBe(true);
    expect(isValidFnsku("X001ABCDE")).toBe(false);
    expect(isValidFnsku("X001-BCDE9")).toBe(false);
  });
});

describe("buildLabelPdf", () => {
  it("makes one 3 x 1.5 inch page per copy across items", async () => {
    const bytes = await buildLabelPdf([item, { ...item, fnsku: "X001ABCDE9", sku: "OTHER", copies: 2 }]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(5);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(LABEL_WIDTH_PT, 2);
    expect(height).toBeCloseTo(LABEL_HEIGHT_PT, 2);
  });

  it("builds the branded style too", async () => {
    const doc = await PDFDocument.load(await buildLabelPdf([{ ...item, copies: 1 }], "branded"));
    expect(doc.getPageCount()).toBe(1);
  });

  it("refuses invalid input instead of printing a wrong label", async () => {
    await expect(buildLabelPdf([{ ...item, fnsku: "bad" }])).rejects.toThrow("FNSKU");
  });
});
