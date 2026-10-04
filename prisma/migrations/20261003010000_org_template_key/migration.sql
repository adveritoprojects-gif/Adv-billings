-- Add industry template key to Organization
ALTER TABLE "Organization" ADD COLUMN "templateKey" TEXT NOT NULL DEFAULT 'general';
