import "@/server/db/env-loader";

import type { SuperAdminActor } from "@/server/services/super-admin";
import {
  onboardOrganization,
  getPlatformMetrics,
} from "@/server/services/super-admin";
import { systemDb } from "@/server/db";

function expect(condition: unknown, label: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`PASS: ${label}`);
}

const BASE_INPUT = {
  name: "Bluebird Bistro",
  slug: "bluebird-bistro",
  businessType: "Restaurant",
  email: "hello@bluebird.test",
  phone: "+1 555 0100",
  website: "https://bluebird.test",
  address: "12 Harbor Lane, Seaside",
  templateKey: "restaurant",
  logo: "https://bluebird.test/logo.png",
  primaryColor: "#ff6b35",
  secondaryColor: "#2b2b2b",
  favicon: "https://bluebird.test/favicon.ico",
  modules: ["orders", "products"],
  ownerName: "Bluebird Owner",
  ownerEmail: "owner-bistro@onboarding.test",
  planKey: "STARTER",
};

async function main() {
  const superUser = await systemDb.user.findUnique({
    where: { email: "super@platform.test" },
  });
  if (!superUser) {
    throw new Error("FAIL: super@platform.test missing (run npm run db:seed)");
  }
  const actor: SuperAdminActor = { userId: superUser.id };

  const before = await getPlatformMetrics();
  expect(before.totalOrganizations === 3, "baseline: 3 client organizations");
  expect(before.totalUsers === 5, "baseline: 5 users");

  const createdIds: string[] = [];
  const createdEmails: string[] = [];

  console.log("--- validation ---");
  const badTemplate = await onboardOrganization(actor, {
    ...BASE_INPUT,
    slug: "validation-template",
    templateKey: "nightclub",
  });
  expect(
    !badTemplate.ok && badTemplate.errorKey?.includes("invalidTemplate"),
    "unknown template rejected",
  );

  const badModule = await onboardOrganization(actor, {
    ...BASE_INPUT,
    slug: "validation-module",
    modules: ["orders", "students"],
  });
  expect(
    !badModule.ok && badModule.errorKey?.includes("invalidModule"),
    "module outside the template rejected",
  );

  const badPlan = await onboardOrganization(actor, {
    ...BASE_INPUT,
    slug: "validation-plan",
    planKey: "PLATINUM",
  });
  expect(
    !badPlan.ok && badPlan.errorKey?.includes("invalidPlan"),
    "unknown plan rejected",
  );

  const badSlug = await onboardOrganization(actor, {
    ...BASE_INPUT,
    slug: "Not A Slug!",
  });
  expect(!badSlug.ok && badSlug.errorKey?.includes("slugInvalid"), "invalid slug rejected");

  const badEmail = await onboardOrganization(actor, {
    ...BASE_INPUT,
    slug: "validation-email",
    ownerEmail: "not-an-email",
  });
  expect(
    !badEmail.ok && badEmail.errorKey?.includes("invalidEmail"),
    "invalid owner email rejected",
  );

  const badColor = await onboardOrganization(actor, {
    ...BASE_INPUT,
    slug: "validation-color",
    primaryColor: "orange",
  });
  expect(
    !badColor.ok && badColor.errorKey?.includes("invalidColor"),
    "invalid color rejected",
  );

  const afterValidation = await getPlatformMetrics();
  expect(
    afterValidation.totalOrganizations === 3,
    "validation failures create no organizations",
  );

  console.log("--- happy path (restaurant + starter) ---");
  const created = await onboardOrganization(actor, BASE_INPUT);
  expect(created.ok, "organization created");
  const summary = created.organization;
  expect(summary, "creation returns the organization summary");
  if (!summary) {
    throw new Error("FAIL: summary missing");
  }
  createdIds.push(summary.id);
  createdEmails.push(summary.owner.email);

  expect(summary.slug === "bluebird-bistro", "summary carries the slug");
  expect(summary.plan.key === "STARTER", "summary carries the plan");
  expect(summary.plan.state === "ACTIVE", "paid plan starts active");
  expect(summary.modules.join(",") === "orders,products", "summary carries modules");
  expect(summary.roles.join(",") === "shift-lead", "summary carries custom roles");
  expect(
    typeof summary.invitationSent === "boolean",
    "onboarding reports whether the invitation email was sent",
  );

  const summaryOwner = await systemDb.user.findUnique({
    where: { email: summary.owner.email },
    select: { status: true },
  });
  expect(summaryOwner?.status === "INVITED", "new owner starts as INVITED");
  const summaryInvite = await systemDb.invitation.findFirst({
    where: { organizationId: summary.id },
  });
  expect(summaryInvite !== null, "an invitation was issued for the owner");

  const org = await systemDb.organization.findUnique({
    where: { id: summary.id },
  });
  expect(org, "organization row exists");
  expect(org?.templateKey === "restaurant", "organization stores templateKey");
  expect(org?.email === "hello@bluebird.test", "organization stores email");
  expect(org?.phone === "+1 555 0100", "organization stores phone");
  expect(org?.website === "https://bluebird.test", "organization stores website");
  expect(org?.address === "12 Harbor Lane, Seaside", "organization stores address");
  expect(org?.primaryColor === "#ff6b35", "organization stores primary color");
  expect(org?.secondaryColor === "#2b2b2b", "organization stores secondary color");
  expect(org?.logo === "https://bluebird.test/logo.png", "organization stores logo");
  expect(org?.favicon === "https://bluebird.test/favicon.ico", "organization stores favicon");

  const ownerUser = await systemDb.user.findUnique({
    where: { email: "owner-bistro@onboarding.test" },
  });
  expect(ownerUser, "owner user created");
  expect(ownerUser?.name === "Bluebird Owner", "owner name stored");

  const member = await systemDb.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: summary.id,
        userId: ownerUser?.id ?? "",
      },
    },
    include: { role: true },
  });
  expect(member, "owner membership created");
  expect(member?.role.key === "owner", "owner membership uses the owner role");

  const moduleRows = await systemDb.organizationModule.findMany({
    where: { organizationId: summary.id },
    include: { module: true },
  });
  const enabledNonCore = moduleRows
    .filter((row) => !row.module.isCore && row.enabled)
    .map((row) => row.module.key)
    .sort();
  expect(
    enabledNonCore.join(",") === "orders,products",
    "only the selected template modules are enabled",
  );
  expect(
    moduleRows.filter((row) => row.module.isCore && row.enabled).length > 0,
    "core modules are enabled",
  );
  const crmRow = moduleRows.find((row) => row.module.key === "crm");
  expect(crmRow && !crmRow.enabled, "deselected template module stays disabled");

  const shiftLead = await systemDb.role.findUnique({
    where: {
      organizationId_key: {
        organizationId: summary.id,
        key: "shift-lead",
      },
    },
  });
  expect(shiftLead, "template custom role created");
  const rolePermissions = await systemDb.rolePermission.count({
    where: { roleId: shiftLead?.id ?? "" },
  });
  expect(rolePermissions > 0, "custom role permissions granted");

  const subscription = await systemDb.subscription.findUnique({
    where: { organizationId: summary.id },
    include: { plan: true },
  });
  expect(subscription, "subscription created");
  expect(String(subscription?.plan.key) === "STARTER", "subscription uses the plan");
  expect(subscription?.state === "ACTIVE", "subscription state is active");
  expect(subscription?.currentPeriodEnd instanceof Date, "billing period recorded");
  expect(subscription?.trialEndsAt === null, "paid plan has no trial end");

  const subEvents = await systemDb.subscriptionEvent.count({
    where: { organizationId: summary.id, type: "CREATED" },
  });
  expect(subEvents === 1, "subscription created event recorded");

  const audit = await systemDb.platformAuditLog.findFirst({
    where: { organizationId: summary.id, action: "organization.created" },
  });
  expect(audit, "platform audit recorded");
  const auditMetadata = audit?.metadata as
    | { source?: string; template?: string; plan?: string }
    | null
    | undefined;
  expect(auditMetadata?.source === "onboarding", "audit marks the onboarding source");
  expect(auditMetadata?.template === "restaurant", "audit records the template");
  expect(auditMetadata?.plan === "STARTER", "audit records the plan");

  console.log("--- duplicate protection ---");
  const duplicate = await onboardOrganization(actor, {
    ...BASE_INPUT,
    name: "Bluebird Bistro Two",
    ownerName: "Other Owner",
    ownerEmail: "owner-bistro-2@onboarding.test",
  });
  expect(
    !duplicate.ok && duplicate.errorKey?.includes("slugTaken"),
    "duplicate slug rejected",
  );
  const afterDuplicate = await getPlatformMetrics();
  expect(
    afterDuplicate.totalOrganizations === 4,
    "duplicate rejection leaves a single organization",
  );
  const duplicateOwner = await systemDb.user.findUnique({
    where: { email: "owner-bistro-2@onboarding.test" },
  });
  expect(!duplicateOwner, "duplicate rejection leaves no orphan owner");

  console.log("--- trial + education template ---");
  const trial = await onboardOrganization(actor, {
    name: "Campus Academy",
    slug: "campus-academy",
    businessType: "Education",
    email: "admin@campus.test",
    phone: "",
    website: "https://campus.test",
    address: "",
    templateKey: "education",
    logo: "",
    primaryColor: "",
    secondaryColor: "",
    favicon: "",
    modules: ["students", "courses"],
    ownerName: "Campus Owner",
    ownerEmail: "owner-campus@onboarding.test",
    planKey: "FREE_TRIAL",
  });
  expect(trial.ok, "trial organization created");
  const trialSummary = trial.organization;
  if (!trialSummary) {
    throw new Error("FAIL: trial summary missing");
  }
  createdIds.push(trialSummary.id);
  createdEmails.push(trialSummary.owner.email);

  expect(trialSummary.plan.state === "TRIAL", "trial plan starts in trial state");
  expect(
    trialSummary.plan.trialEndsAt instanceof Date &&
      trialSummary.plan.trialEndsAt.getTime() > Date.now(),
    "trial end date is in the future",
  );
  expect(trialSummary.roles.join(",") === "instructor", "education custom role created");

  const trialModules = await systemDb.organizationModule.findMany({
    where: { organizationId: trialSummary.id },
    include: { module: true },
  });
  const trialEnabled = trialModules
    .filter((row) => !row.module.isCore && row.enabled)
    .map((row) => row.module.key)
    .sort();
  expect(
    trialEnabled.join(",") === "courses,students",
    "trial organization enables its education modules",
  );
  const trialCrm = trialModules.find((row) => row.module.key === "crm");
  expect(trialCrm && !trialCrm.enabled, "education organization leaves crm disabled");

  console.log("--- existing owner reuse ---");
  const reuse = await onboardOrganization(actor, {
    ...BASE_INPUT,
    name: "Harbor Goods",
    slug: "harbor-goods",
    templateKey: "retail",
    modules: ["products", "inventory", "orders", "suppliers"],
    ownerName: "Ignored Existing Name",
    ownerEmail: "owner-b@org-b.test",
    planKey: "BUSINESS",
  });
  expect(reuse.ok, "existing user attached as owner without a password");
  const reuseSummary = reuse.organization;
  if (!reuseSummary) {
    throw new Error("FAIL: reuse summary missing");
  }
  createdIds.push(reuseSummary.id);
  expect(reuseSummary.owner.email === "owner-b@org-b.test", "existing owner reused");
  const reuseOrgs = await systemDb.organizationMember.count({
    where: { userId: (await systemDb.user.findUnique({ where: { email: "owner-b@org-b.test" } }))?.id ?? "", organizationId: reuseSummary.id },
  });
  expect(reuseOrgs === 1, "existing owner membership created");

  console.log("--- cleanup ---");
  await systemDb.platformAuditLog.deleteMany({
    where: { organizationId: { in: createdIds } },
  });
  await systemDb.organization.deleteMany({
    where: { id: { in: createdIds } },
  });
  await systemDb.user.deleteMany({
    where: { email: { in: createdEmails } },
  });

  const after = await getPlatformMetrics();
  expect(after.totalOrganizations === 3, "cleanup restores organization count");
  expect(after.totalUsers === 5, "cleanup restores user count");
  expect(after.activeSubscriptions === before.activeSubscriptions, "cleanup restores subscriptions");
  expect(after.mrrCents === before.mrrCents, "cleanup restores MRR");

  const leftoverOwner = await systemDb.user.findUnique({
    where: { email: "owner-bistro@onboarding.test" },
  });
  expect(!leftoverOwner, "cleanup removes the test owner");

  console.log("");
  console.log("all onboarding checks passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => systemDb.$disconnect());
