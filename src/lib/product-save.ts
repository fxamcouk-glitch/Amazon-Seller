import { ReadOnlyCatalogueError, SlugTakenError, type ProductStore } from "./catalogue";
import { parseProductInput } from "./product-input";

export type SaveOutcome = { status: number; body: { error: string } | { ok: true; sku: string } };

// Shared by the create and update routes so both enforce the same rules.
export async function saveProductRequest(
  store: ProductStore,
  body: unknown,
  mode: { create: true } | { create: false; sku: string },
  afterSave?: () => Promise<unknown>,
): Promise<SaveOutcome> {
  const parsed = parseProductInput(body, mode.create ? undefined : mode.sku);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const { record } = parsed;

  const exists = Boolean(await store.getRecord(record.sku));
  if (mode.create && exists) return { status: 409, body: { error: "A product with that SKU already exists." } };
  if (!mode.create && !exists) return { status: 404, body: { error: "Product not found." } };

  try {
    await store.save(record);
  } catch (error) {
    if (error instanceof SlugTakenError) return { status: 409, body: { error: error.message } };
    if (error instanceof ReadOnlyCatalogueError) return { status: 503, body: { error: error.message } };
    throw error;
  }
  // Best effort: tidying unused photos must never turn a successful save into an error.
  await afterSave?.().catch(() => undefined);
  return { status: mode.create ? 201 : 200, body: { ok: true, sku: record.sku } };
}
