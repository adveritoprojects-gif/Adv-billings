-- CreateEnum
CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CrmLeadSource" AS ENUM ('WEB_FORM', 'REFERRAL', 'IMPORT', 'COLD_CALL', 'SOCIAL', 'ADS', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CrmPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "CrmCustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CHURNED');

-- CreateEnum
CREATE TYPE "CrmFollowUpType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "CrmFollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('CREATED', 'STATUS_CHANGE', 'ASSIGNMENT', 'NOTE', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'TASK', 'SYSTEM');

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "source" "CrmLeadSource" NOT NULL DEFAULT 'OTHER',
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "CrmPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "companyId" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCompany" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "size" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "status" "CrmCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedToId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "actorId" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "customerId" TEXT,
    "companyId" TEXT,
    "taskId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CrmPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "customerId" TEXT,
    "companyId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFollowUp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "CrmFollowUpType" NOT NULL DEFAULT 'CALL',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "CrmFollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assignedToId" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmLead_organizationId_status_idx" ON "CrmLead"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CrmLead_organizationId_createdAt_idx" ON "CrmLead"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmLead_organizationId_assignedToId_idx" ON "CrmLead"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "CrmLead_organizationId_company_idx" ON "CrmLead"("organizationId", "company");

-- CreateIndex
CREATE INDEX "CrmContact_organizationId_createdAt_idx" ON "CrmContact"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmContact_organizationId_companyId_idx" ON "CrmContact"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "CrmContact_organizationId_assignedToId_idx" ON "CrmContact"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "CrmCompany_organizationId_createdAt_idx" ON "CrmCompany"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmCompany_organizationId_name_idx" ON "CrmCompany"("organizationId", "name");

-- CreateIndex
CREATE INDEX "CrmCustomer_organizationId_status_idx" ON "CrmCustomer"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CrmCustomer_organizationId_createdAt_idx" ON "CrmCustomer"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmCustomer_organizationId_assignedToId_idx" ON "CrmCustomer"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "CrmActivity_organizationId_occurredAt_idx" ON "CrmActivity"("organizationId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "CrmActivity_organizationId_leadId_idx" ON "CrmActivity"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "CrmActivity_organizationId_type_idx" ON "CrmActivity"("organizationId", "type");

-- CreateIndex
CREATE INDEX "CrmTask_organizationId_status_idx" ON "CrmTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CrmTask_organizationId_dueAt_idx" ON "CrmTask"("organizationId", "dueAt");

-- CreateIndex
CREATE INDEX "CrmTask_organizationId_createdAt_idx" ON "CrmTask"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmTask_organizationId_assignedToId_idx" ON "CrmTask"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "CrmNote_organizationId_createdAt_idx" ON "CrmNote"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CrmNote_organizationId_leadId_idx" ON "CrmNote"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "CrmFollowUp_organizationId_dueAt_idx" ON "CrmFollowUp"("organizationId", "dueAt");

-- CreateIndex
CREATE INDEX "CrmFollowUp_organizationId_status_idx" ON "CrmFollowUp"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CrmFollowUp_organizationId_leadId_idx" ON "CrmFollowUp"("organizationId", "leadId");

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CrmTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CrmTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
