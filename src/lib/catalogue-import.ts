// Decides whether the catalogue import may refresh a product: only when nobody has edited it since
// the import last wrote it. A dashboard save moves `updatedAt` past `importedAt`.
// Products from the very first import (before `importedAt` existed) count as untouched while they
// still have their creation time.
const SAME_WRITE_MS = 5_000; // the import's own save and its importedAt stamp land within this window

export function isUntouchedSinceImport(row: { createdAt: Date; updatedAt: Date; importedAt: Date | null }): boolean {
  const stamp = row.importedAt ?? row.createdAt;
  return row.updatedAt.getTime() - stamp.getTime() <= SAME_WRITE_MS;
}
