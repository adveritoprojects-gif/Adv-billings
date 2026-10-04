import "@/server/db/env-loader";

import { BILLING_ERRORS } from "@/server/billing/errors";
import {
  canAddUser,
  canCreateCustomer,
  canCreateLead,
  canCreateProject,
  checkPlanLimit,
} from "@/server/billing/limits";
import {
  checkSubscription,
  hasModuleAccess,
  planCoversModule,
} from "@/server/billing/subscription";
import type { BillingContext } from "@/server/billing/types";
import { getUsageSnapshots } from "@/server/billing/usage";
import { db, systemDb, withTenant } from "@/server/db";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TokenAccount {
  token: string;
  organizationId: string;
  organizationSlug: string;
}

function loadTokenFile(): Record<string, TokenAccount> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "prisma/.test-tokens.json"), "utf8"),
  );
}

function ctxFor(
  organizationId: string,
  roleKey = "owner",
  modules: string[] = [],
): BillingContext {
  return {
    organization: { id: organizationId },
    role: { key: roleKey },
    modules,
  };
}

function expect(condition: unknown, label: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`PASS: ${label}`);
}

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const tokens = loadTokenFile();
  const orgAId = tokens.ownerA.organizationId;
  const orgBId = tokens.ownerB.organizationId;
  const orgCId = tokens.ownerC.organizationId;

  const checkA = await checkSubscription(ctxFor(orgAId));
  expect(checkA.access === "full", "org A has full access");
  expect(
    checkA.subscription?.plan.key === "PROFESSIONAL",
    "org A is on PROFESSIONAL",
  );
  expect(checkA.subscription?.state === "ACTIVE", "org A state is ACTIVE");
  expect(
    planCoversModule(checkA, "crm") && planCoversModule(checkA, "finance"),
    "PROFESSIONAL covers crm and finance",
  );
  expect(
    !planCoversModule(checkA, "students"),
    "PROFESSIONAL does not cover education modules",
  );
  expect(
    await hasModuleAccess(ctxFor(orgAId, "owner", ["crm", "sales"]), "crm"),
    "hasModuleAccess allows crm when org and plan both enable it",
  );
  expect(
    !(await hasModuleAccess(
      ctxFor(orgAId, "owner", ["crm", "sales", "students"]),
      "students",
    )),
    "hasModuleAccess denies students missing from the plan",
  );

  const aRow = await systemDb.subscription.findUniqueOrThrow({
    where: { organizationId: orgAId },
  });
  const originalAPeriodEnd = aRow.currentPeriodEnd;
  await systemDb.subscription.update({
    where: { id: aRow.id },
    data: { currentPeriodEnd: new Date(Date.now() - 1000) },
  });
  const pastDue = await checkSubscription(ctxFor(orgAId));
  expect(
    pastDue.subscription?.state === "PAST_DUE",
    "ACTIVE with a past period end advances to PAST_DUE",
  );
  expect(pastDue.access === "readonly", "PAST_DUE grants read-only access");
  expect(
    pastDue.errorKey === BILLING_ERRORS.subscriptionReadOnly,
    "PAST_DUE exposes the read-only error key",
  );
  const readOnlyLead = await canCreateLead(ctxFor(orgAId));
  expect(
    !readOnlyLead.ok &&
      readOnlyLead.errorKey === BILLING_ERRORS.subscriptionReadOnly,
    "canCreateLead fails while the subscription is read-only",
  );
  const persistedPastDue = await systemDb.subscription.findUnique({
    where: { id: aRow.id },
  });
  expect(
    persistedPastDue?.state === "PAST_DUE",
    "the PAST_DUE transition is persisted",
  );
  const pastDueEvents = await systemDb.subscriptionEvent.findMany({
    where: { organizationId: orgAId, type: "STATE_CHANGED" },
    orderBy: { createdAt: "desc" },
  });
  expect(
    pastDueEvents.length > 0 &&
      pastDueEvents[0].fromState === "ACTIVE" &&
      pastDueEvents[0].toState === "PAST_DUE",
    "a STATE_CHANGED event records ACTIVE -> PAST_DUE",
  );
  await systemDb.subscription.update({
    where: { id: aRow.id },
    data: { state: "ACTIVE", currentPeriodEnd: originalAPeriodEnd },
  });

  const bRow = await systemDb.subscription.findUniqueOrThrow({
    where: { organizationId: orgBId },
  });
  const originalBPlanId = bRow.planId;
  const checkB = await checkSubscription(ctxFor(orgBId));
  expect(
    checkB.subscription?.plan.key === "BUSINESS",
    "org B is on BUSINESS",
  );
  expect(planCoversModule(checkB, "reports"), "BUSINESS covers reports");
  const starter = await systemDb.plan.findUnique({
    where: { key: "STARTER" },
  });
  if (!starter) {
    throw new Error("FAIL: STARTER plan missing (run npm run db:seed)");
  }
  await systemDb.subscription.update({
    where: { id: bRow.id },
    data: { planId: starter.id },
  });
  const bOnStarter = await checkSubscription(ctxFor(orgBId));
  expect(
    !planCoversModule(bOnStarter, "reports"),
    "STARTER does not cover reports",
  );
  expect(
    !(await hasModuleAccess(
      ctxFor(orgBId, "owner", ["crm", "tasks", "reports"]),
      "reports",
    )),
    "hasModuleAccess denies reports when the plan drops the module",
  );
  await systemDb.subscription.update({
    where: { id: bRow.id },
    data: { planId: originalBPlanId },
  });

  const checkC = await checkSubscription(ctxFor(orgCId));
  expect(
    checkC.subscription?.state === "TRIAL",
    "org C is in TRIAL on the free plan",
  );
  expect(checkC.access === "full", "TRIAL grants full access");
  const cLeadCount = await withTenant(orgCId, () => db.crmLead.count());
  expect(
    cLeadCount === 5,
    `org C is seeded at the lead limit (expected 5 leads, found ${cLeadCount})`,
  );
  const cLeadLimit = await canCreateLead(ctxFor(orgCId));
  expect(
    !cLeadLimit.ok && cLeadLimit.errorKey === BILLING_ERRORS.leadLimit,
    "canCreateLead returns the lead limit error at the plan cap",
  );
  expect(
    cLeadLimit.used === 5 && cLeadLimit.limit === 5,
    "the lead limit check reports used=5 and limit=5",
  );
  const limitEvents = await systemDb.subscriptionEvent.findMany({
    where: { organizationId: orgCId, type: "LIMIT_REACHED" },
  });
  expect(limitEvents.length > 0, "a LIMIT_REACHED event is recorded");
  const cCustomerLimit = await canCreateCustomer(ctxFor(orgCId));
  expect(cCustomerLimit.ok, "canCreateCustomer passes below the cap");
  const cProjectLimit = await canCreateProject(ctxFor(orgCId));
  expect(
    cProjectLimit.ok && cProjectLimit.limit === 1,
    "canCreateProject passes below maxProjects=1",
  );
  const cProjectOver = await checkPlanLimit(ctxFor(orgCId), "maxProjects", 2);
  expect(
    !cProjectOver.ok && cProjectOver.errorKey === BILLING_ERRORS.projectLimit,
    "checkPlanLimit fails past maxProjects with the project limit error",
  );
  const cUserLimit = await canAddUser(ctxFor(orgCId));
  expect(
    cUserLimit.ok && cUserLimit.limit === 3,
    "canAddUser passes below maxUsers=3",
  );
  const cUserOver = await canAddUser(ctxFor(orgCId), 5);
  expect(
    !cUserOver.ok && cUserOver.errorKey === BILLING_ERRORS.userLimit,
    "canAddUser fails past maxUsers with the user limit error",
  );

  await systemDb.subscription.update({
    where: { organizationId: orgCId },
    data: { trialEndsAt: new Date(Date.now() - 1000) },
  });
  const expired = await checkSubscription(ctxFor(orgCId));
  expect(
    expired.subscription?.state === "EXPIRED",
    "TRIAL past trialEndsAt advances to EXPIRED",
  );
  expect(expired.access === "none", "EXPIRED revokes access");
  expect(
    expired.errorKey === BILLING_ERRORS.subscriptionExpired,
    "EXPIRED exposes the expired error key",
  );
  const expiredLead = await canCreateLead(ctxFor(orgCId));
  expect(
    !expiredLead.ok &&
      expiredLead.errorKey === BILLING_ERRORS.subscriptionExpired,
    "canCreateLead fails while the subscription is expired",
  );
  await systemDb.subscription.update({
    where: { organizationId: orgCId },
    data: {
      state: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * DAY),
      endedAt: null,
    },
  });

  await systemDb.subscription.update({
    where: { id: bRow.id },
    data: { state: "SUSPENDED" },
  });
  const suspended = await checkSubscription(ctxFor(orgBId));
  expect(
    suspended.access === "none" &&
      suspended.errorKey === BILLING_ERRORS.subscriptionSuspended,
    "SUSPENDED blocks access with the suspended error key",
  );
  const asSuperAdmin = await checkSubscription(
    ctxFor(orgBId, "super_admin"),
  );
  expect(
    asSuperAdmin.access === "full",
    "super_admin bypasses subscription state",
  );
  await systemDb.subscription.update({
    where: { id: bRow.id },
    data: { state: "ACTIVE" },
  });

  const snapshotsC = await getUsageSnapshots(ctxFor(orgCId));
  expect(snapshotsC.length === 5, "getUsageSnapshots returns 5 metrics");
  const leadsSnapshot = snapshotsC.find((row) => row.metric === "LEADS");
  expect(
    leadsSnapshot?.used === 5 && leadsSnapshot.limit === 5,
    "the usage snapshot reports leads 5/5",
  );
  const usersSnapshot = snapshotsC.find((row) => row.metric === "USERS");
  expect(
    usersSnapshot?.used === 1 && usersSnapshot.limit === 3,
    "the usage snapshot reports users 1/3",
  );
  const usageRows = await systemDb.usage.findMany({
    where: { organizationId: orgCId },
  });
  expect(usageRows.length >= 3, "usage rows were synced for org C");

  const checkAAgain = await checkSubscription(ctxFor(orgAId));
  const checkBFinal = await checkSubscription(ctxFor(orgBId));
  expect(
    checkAAgain.subscription?.plan.key === "PROFESSIONAL" &&
      checkBFinal.subscription?.plan.key === "BUSINESS",
    "org A and org B resolve their own subscriptions after all transitions",
  );
  expect(
    checkAAgain.subscription?.id !== checkBFinal.subscription?.id,
    "each organization keeps an isolated subscription row",
  );

  console.log("PASS: all billing checks passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
