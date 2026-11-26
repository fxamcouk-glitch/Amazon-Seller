-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmationEmailId" TEXT,
ADD COLUMN     "confirmationError" TEXT,
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3);

