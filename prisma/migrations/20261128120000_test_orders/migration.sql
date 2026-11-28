-- Orders paid in Stripe test mode: shown as TEST, no invoice number, never sent to Amazon.
ALTER TABLE "Order" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
