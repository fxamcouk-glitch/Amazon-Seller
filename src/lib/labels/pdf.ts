import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { barRuns, code128Modules } from "./code128";

// Size of Amazon's own item fulfilment label (3 x 1.5 inch), matched to the owner's sample PDF.
export const LABEL_WIDTH_PT = 216.24;
export const LABEL_HEIGHT_PT = 108.12;

const SIDE_MARGIN_PT = 18; // 0.25 in on each side, also the barcode's quiet zone
const BARCODE_TOP_PT = 12;
const BARCODE_HEIGHT_PT = 38;
const MIN_MODULE_PT = 1.0; // about 0.35 mm, the narrowest bar we allow
const MAX_MODULE_PT = 1.4;

export const MAX_COPIES_PER_ITEM = 500;
export const MAX_TOTAL_LABELS = 1000;

export type LabelStyle = "standard" | "branded";

export type LabelItem = { fnsku: string; sku: string; copies: number };

export function isValidFnsku(value: string): boolean {
  return /^[A-Z0-9]{10}$/.test(value);
}

export function validateItems(items: LabelItem[]): string | null {
  if (items.length === 0) return "Choose at least one label.";
  let total = 0;
  for (const item of items) {
    if (!isValidFnsku(item.fnsku)) return `"${item.sku}" has no valid FNSKU (10 capital letters and numbers).`;
    if (!Number.isInteger(item.copies) || item.copies < 1 || item.copies > MAX_COPIES_PER_ITEM) {
      return `Copies for "${item.sku}" must be a whole number from 1 to ${MAX_COPIES_PER_ITEM}.`;
    }
    total += item.copies;
  }
  return total > MAX_TOTAL_LABELS ? `That is ${total} labels; the limit is ${MAX_TOTAL_LABELS} at once.` : null;
}

// One label per page, like the Amazon sample, so it prints on a 3 x 1.5 inch label printer or
// can be printed with "actual size" (never "fit to page") onto matching label stock.
export async function buildLabelPdf(items: LabelItem[], style: LabelStyle = "standard", brand = "TheCable.Store"): Promise<Uint8Array> {
  const problem = validateItems(items);
  if (problem) throw new Error(problem);

  const pdf = await PDFDocument.create();
  pdf.setTitle("Item labels");
  pdf.setCreator("TheCable.Store Seller Hub");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);

  const centered = (page: ReturnType<typeof pdf.addPage>, text: string, font: typeof regular, size: number, fromTop: number) => {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (LABEL_WIDTH_PT - width) / 2, y: LABEL_HEIGHT_PT - fromTop, size, font, color: black });
  };

  for (const item of items) {
    const modules = code128Modules(item.fnsku);
    const available = LABEL_WIDTH_PT - 2 * SIDE_MARGIN_PT;
    const moduleWidth = Math.min(MAX_MODULE_PT, available / modules.length);
    if (moduleWidth < MIN_MODULE_PT) throw new Error(`"${item.fnsku}" is too long to print at a scannable size`);
    const barcodeWidth = moduleWidth * modules.length;
    const left = (LABEL_WIDTH_PT - barcodeWidth) / 2;
    const runs = barRuns(modules);
    const sku = item.sku.length > 34 ? `${item.sku.slice(0, 33)}…` : item.sku;

    for (let n = 0; n < item.copies; n++) {
      const page = pdf.addPage([LABEL_WIDTH_PT, LABEL_HEIGHT_PT]);
      for (const run of runs) {
        page.drawRectangle({
          x: left + run.start * moduleWidth,
          y: LABEL_HEIGHT_PT - BARCODE_TOP_PT - BARCODE_HEIGHT_PT,
          width: run.length * moduleWidth,
          height: BARCODE_HEIGHT_PT,
          color: black,
        });
      }
      centered(page, item.fnsku, bold, 10.5, BARCODE_TOP_PT + BARCODE_HEIGHT_PT + 14);
      centered(page, sku, regular, 9, BARCODE_TOP_PT + BARCODE_HEIGHT_PT + 28);
      if (style === "branded") {
        page.drawLine({
          start: { x: left, y: LABEL_HEIGHT_PT - 96 },
          end: { x: left + barcodeWidth, y: LABEL_HEIGHT_PT - 96 },
          thickness: 0.5,
          color: black,
        });
        centered(page, brand.toUpperCase(), regular, 6.5, 104);
      }
    }
  }
  return pdf.save();
}
