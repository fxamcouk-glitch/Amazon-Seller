-- Lets the catalogue import refresh products that nobody has edited since they were imported.
ALTER TABLE "Product" ADD COLUMN "importedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "importedImageUrl" TEXT;
