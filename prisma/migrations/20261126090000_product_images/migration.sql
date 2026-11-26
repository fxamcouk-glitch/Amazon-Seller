-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageAlt" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "large" BYTEA NOT NULL,
    "thumb" BYTEA NOT NULL,
    "side" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

