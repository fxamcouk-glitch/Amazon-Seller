-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "displayName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "image" TEXT,
ADD COLUMN     "inStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pricePence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "specs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_published_idx" ON "Product"("published");

