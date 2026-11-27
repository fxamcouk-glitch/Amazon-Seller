import { describe, expect, it } from "vitest";
import { isUntouchedSinceImport } from "./catalogue-import";

const t = (s: number) => new Date(Date.UTC(2026, 10, 27, 12, 0, s));

describe("isUntouchedSinceImport", () => {
  it("treats a product saved only by the import as untouched", () => {
    expect(isUntouchedSinceImport({ createdAt: t(0), updatedAt: t(1), importedAt: t(1) })).toBe(true);
  });
  it("protects a product edited after the import", () => {
    expect(isUntouchedSinceImport({ createdAt: t(0), updatedAt: t(40), importedAt: t(1) })).toBe(false);
  });
  it("handles products from the first import, before importedAt existed", () => {
    expect(isUntouchedSinceImport({ createdAt: t(0), updatedAt: t(0), importedAt: null })).toBe(true);
    expect(isUntouchedSinceImport({ createdAt: t(0), updatedAt: t(30), importedAt: null })).toBe(false);
  });
});
