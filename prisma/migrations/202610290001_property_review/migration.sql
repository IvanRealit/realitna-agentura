-- Additive migration; no existing property/lead/user data is rewritten.
-- REVIEW is used only by the new application after this transaction commits.
ALTER TYPE "PropertyStatus" ADD VALUE 'REVIEW';
ALTER TABLE "Property" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AuditLog" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
