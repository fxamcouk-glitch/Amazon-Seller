-- Amazon Multi-Channel Fulfilment on website orders, and stock read from Amazon.
ALTER TABLE "Order" ADD COLUMN "amazonFulfilmentId" TEXT,
ADD COLUMN "amazonSentAt" TIMESTAMP(3),
ADD COLUMN "amazonError" TEXT,
ADD COLUMN "amazonStatus" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "carrier" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3);

ALTER TABLE "Product" ADD COLUMN "stockQuantity" INTEGER,
ADD COLUMN "stockCheckedAt" TIMESTAMP(3),
ADD COLUMN "selfDispatch" BOOLEAN NOT NULL DEFAULT false;
