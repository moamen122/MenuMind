-- AlterTable Restaurant: add slug, logo, currency for public QR menu
ALTER TABLE "Restaurant" ADD COLUMN "slug" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "logo" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "currency" TEXT DEFAULT 'EGP';

-- Unique index on slug (multiple NULLs allowed in PostgreSQL)
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE INDEX "Restaurant_slug_idx" ON "Restaurant"("slug");

-- CreateTable MenuAnalytics (public menu view/item/category analytics)
CREATE TABLE "MenuAnalytics" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "itemId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MenuAnalytics_restaurantId_idx" ON "MenuAnalytics"("restaurantId");
CREATE INDEX "MenuAnalytics_eventType_idx" ON "MenuAnalytics"("eventType");
CREATE INDEX "MenuAnalytics_createdAt_idx" ON "MenuAnalytics"("createdAt");

ALTER TABLE "MenuAnalytics" ADD CONSTRAINT "MenuAnalytics_restaurantId_fkey" 
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
