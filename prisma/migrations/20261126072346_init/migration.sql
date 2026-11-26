-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('AMAZON', 'SHOPIFY', 'WEBSITE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costPence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "bullets" TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "backendKeywords" TEXT NOT NULL DEFAULT '',
    "targetKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "fnsku" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelDailyStat" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "channel" "Channel" NOT NULL,
    "revenuePence" INTEGER NOT NULL,
    "orders" INTEGER NOT NULL,
    "units" INTEGER NOT NULL,
    "sessions" INTEGER NOT NULL,

    CONSTRAINT "ChannelDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shipLine1" TEXT NOT NULL,
    "shipLine2" TEXT,
    "shipCity" TEXT NOT NULL,
    "shipRegion" TEXT,
    "shipPostcode" TEXT NOT NULL,
    "shipCountry" TEXT NOT NULL,
    "subtotalPence" INTEGER NOT NULL,
    "shippingPence" INTEGER NOT NULL DEFAULT 0,
    "totalPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPricePence" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdf" BYTEA NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "id" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_productId_channel_key" ON "Listing"("productId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelDailyStat_date_channel_key" ON "ChannelDailyStat"("date", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
