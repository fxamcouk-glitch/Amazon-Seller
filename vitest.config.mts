import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Database tests share one database and empty its tables, so test files run one at a time.
  test: { include: ["src/**/*.test.ts"], fileParallelism: false },
});
