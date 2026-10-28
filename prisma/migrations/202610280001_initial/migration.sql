CREATE TYPE "Role" AS ENUM ('ADMIN','MANAGER','AGENT');
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT','PUBLISHED','RESERVED','SOLD','RENTED','ARCHIVED');
CREATE TYPE "LeadStatus" AS ENUM ('NEW','IN_PROGRESS','CLOSED');
CREATE TABLE "User" (
 "id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "name" TEXT NOT NULL,
 "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'AGENT',
 "active" BOOLEAN NOT NULL DEFAULT true, "bio" JSONB NOT NULL DEFAULT '{}',
 "phone" TEXT, "avatar" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Session" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "Property" (
 "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "translations" JSONB NOT NULL,
 "city" TEXT NOT NULL, "region" TEXT NOT NULL, "address" TEXT NOT NULL,
 "type" TEXT NOT NULL, "transaction" TEXT NOT NULL, "condition" TEXT NOT NULL,
 "price" INTEGER NOT NULL, "area" DOUBLE PRECISION NOT NULL, "rooms" INTEGER NOT NULL,
 "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT', "demo" BOOLEAN NOT NULL DEFAULT true,
 "featured" BOOLEAN NOT NULL DEFAULT false, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION,
 "images" TEXT[] NOT NULL, "videoUrl" TEXT, "tourUrl" TEXT, "floorPlan" TEXT, "brochure" TEXT,
 "seo" JSONB NOT NULL DEFAULT '{}', "agentId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Property_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
CREATE INDEX "Property_status_city_transaction_idx" ON "Property"("status","city","transaction");
CREATE TABLE "Lead" (
 "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "phone" TEXT,
 "message" TEXT NOT NULL, "kind" TEXT NOT NULL, "locale" TEXT NOT NULL, "consentAt" TIMESTAMP(3) NOT NULL,
 "privacyVersion" TEXT NOT NULL DEFAULT '2026-10-draft', "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
 "agentId" TEXT, "propertyId" TEXT, "notes" TEXT NOT NULL DEFAULT '',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Lead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Lead_agentId_status_idx" ON "Lead"("agentId","status");
CREATE TABLE "Content" (
 "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "translations" JSONB NOT NULL, "published" BOOLEAN NOT NULL DEFAULT false, "seo" JSONB NOT NULL DEFAULT '{}',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");
CREATE TABLE "Settings" (
 "id" TEXT NOT NULL DEFAULT 'site' PRIMARY KEY, "brand" TEXT NOT NULL DEFAULT 'DOMOV',
 "email" TEXT NOT NULL DEFAULT 'hello@example.invalid', "phone" TEXT NOT NULL DEFAULT '',
 "address" TEXT NOT NULL DEFAULT 'Slovensko — DEMO', "retentionDays" INTEGER NOT NULL DEFAULT 180
);
CREATE TABLE "AuditLog" (
 "id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
 "resource" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RateLimit" ("key" TEXT NOT NULL PRIMARY KEY,"count" INTEGER NOT NULL DEFAULT 1,"expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
