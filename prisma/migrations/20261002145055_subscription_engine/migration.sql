-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('FREE_TRIAL', 'STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionState" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'PLAN_CHANGED', 'STATE_CHANGED', 'RENEWED', 'CANCELLED', 'LIMIT_REACHED');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('USERS', 'LEADS', 'CUSTOMERS', 'PROJECTS', 'STORAGE');

-- DropIndex
DROP INDEX "Plan_code_key";

-- DropIndex
DROP INDEX "Subscription_organizationId_status_idx";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "code",
DROP COLUMN "features",
DROP COLUMN "maxModules",
DROP COLUMN "maxUsers",
ADD COLUMN     "key" "PlanKey" NOT NULL,
ADD COLUMN     "limits" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "seatLimit",
DROP COLUMN "status",
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "state" "SubscriptionState" NOT NULL DEFAULT 'TRIAL';

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" "SubscriptionEventType" NOT NULL,
    "fromState" "SubscriptionState",
    "toState" "SubscriptionState",
    "planKey" "PlanKey",
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "metric" "UsageMetric" NOT NULL,
    "quantity" BIGINT NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionEvent_organizationId_createdAt_idx" ON "SubscriptionEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_subscriptionId_idx" ON "SubscriptionEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "Usage_organizationId_metric_idx" ON "Usage"("organizationId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_organizationId_metric_periodStart_key" ON "Usage"("organizationId", "metric", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_state_idx" ON "Subscription"("state");

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

