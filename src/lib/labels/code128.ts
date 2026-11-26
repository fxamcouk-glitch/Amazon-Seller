import CODE128AUTO from "jsbarcode/bin/barcodes/CODE128/CODE128_AUTO.js";

export const STOP_PATTERN = "1100011101011";

// Returns the Code 128 barcode as a string of modules: "1" is a bar, "0" a space, including the
// start code, check digit and stop pattern. Throws for text Code 128 cannot hold.
export function code128Modules(text: string): string {
  const encoder = new CODE128AUTO(text, {});
  if (!encoder.valid()) throw new Error(`Cannot encode "${text}" as Code 128`);
  return encoder.encode().data;
}

// Merges runs of bars so each is drawn as one rectangle (no hairline gaps between neighbours).
export function barRuns(modules: string): { start: number; length: number }[] {
  const runs: { start: number; length: number }[] = [];
  let start = -1;
  for (let i = 0; i <= modules.length; i++) {
    const bar = modules[i] === "1";
    if (bar && start === -1) start = i;
    if (!bar && start !== -1) {
      runs.push({ start, length: i - start });
      start = -1;
    }
  }
  return runs;
}
