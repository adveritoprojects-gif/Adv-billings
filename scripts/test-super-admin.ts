import "@/server/db/env-loader";

import type { SuperAdminActor } from "@/server/services/super-admin";
import {
  SUPER_ADMIN_ERRORS,
  addMember,
  assignPlan,
  createOrganization,
  extendTrial,
  getOrganizationDetail,
  getPlatformMetrics,
  listOrganizations,
  reactivateSubscription,
  removeMember,
  setModuleEnabled,
  setOrganizationStatus,
  startTrial,
  suspendSubscription,
  updateBranding,
  updateMemberRole,
  updateOrganization,
} from "@/server/services/super-admin";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { systemDb } from "@/server/db";

function expect(condition: unknown, label: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`PASS: ${label}`);
}

function loadTokenFile(): Record<
  string,
  { token: string; organizationId: string; organizationSlug: string; role: string; email?: string }
> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "prisma/.test-tokens.json"), "utf8"),
  );
}

async function main() {
  const tokens = loadTokenFile();
  const superAccount = tokens.superAdmin;
  if (!superAccount) {
    throw new Error("FAIL: superAdmin token missing (run npm run db:seed)");
  }
  const superUser = await systemDb.user.findUnique({
    where: { email: "super@platform.test" },
  });
  if (!superUser) {
    throw new Error("FAIL: super@platform.test missing (run npm run db:seed)");
  }
  const actor: SuperAdminActor = { userId: superUser.id };
  const platformOrgId = superAccount.organizationId;

  const before = await getPlatformMetrics();
  expect(before.totalOrganizations === 3, "baseline: 3 client organizations");
  expect(before.activeOrganizations === 3, "baseline: 3 active organizations");
  expect(before.trialOrganizations === 1, "baseline: 1 trial organization");
  expect(before.suspendedOrganizations === 0, "baseline: 0 suspended");
  expect(before.totalUsers === 5, "baseline: 5 users");
  expect(before.activeSubscriptions === 3, "baseline: 3 active subscriptions");
  expect(before.mrrCents === 14800, "baseline: MRR is 14800 cents");

  const baselineList = await listOrganizations();
  expect(baselineList.length === 3, "baseline list shows 3 organizations");
  expect(
    baselineList.every((row) => row.slug !== "platform-hq"),
    "platform organization is excluded from the list",
  );
  expect(
    (await getOrganizationDetail(platformOrgId)) === null,
    "platform organization detail is not exposed",
  );

  const required = await createOrganization(actor, {
    name: "",
    slug: "",
    businessType: "",
    ownerName: "",
    ownerEmail: "",
  });
  expect(
    required.ok === false && required.errorKey === SUPER_ADMIN_ERRORS.required,
    "createOrganization rejects missing name and slug",
  );

  const badSlug = await createOrganization(actor, {
    name: "Bad Slug Co",
    slug: "Bad Slug!",
    businessType: "test",
    ownerName: "Owner",
    ownerEmail: "bad-slug-owner@sa.test",
  });
  expect(
    badSlug.ok === false && badSlug.errorKey === SUPER_ADMIN_ERRORS.slugInvalid,
    "createOrganization rejects an invalid slug",
  );

  const badEmail = await createOrganization(actor, {
    name: "Bad Email Co",
    slug: "bad-email-co",
    businessType: "test",
    ownerName: "Owner",
    ownerEmail: "not-an-email",
  });
  expect(
    badEmail.ok === false && badEmail.errorKey === SUPER_ADMIN_ERRORS.invalidEmail,
    "createOrganization rejects an invalid owner email",
  );

  const badTemplate = await createOrganization(actor, {
    name: "Bad Template Co",
    slug: "bad-template-co",
    businessType: "test",
    templateKey: "not-a-template",
    ownerName: "Owner",
    ownerEmail: "bad-template-owner@sa.test",
  });
  expect(
    badTemplate.ok === false &&
      badTemplate.errorKey === SUPER_ADMIN_ERRORS.invalidTemplate,
    "createOrganization rejects an unknown industry template",
  );

  const orgOne = await createOrganization(actor, {
    name: "Test Co",
    slug: "test-co",
    businessType: "testing",
    ownerName: "Tess Owner",
    ownerEmail: "test-owner@sa.test",
  });
  expect(orgOne.ok === true && orgOne.id, "createOrganization creates Test Co");
  const orgOneId = orgOne.id!;

  const orgOneOwner = await systemDb.user.findUnique({
    where: { email: "test-owner@sa.test" },
    select: { id: true, status: true, emailVerified: true },
  });
  expect(orgOneOwner?.status === "INVITED", "new owner starts as INVITED");
  expect(
    orgOneOwner?.emailVerified === null,
    "owner email stays unverified until activation",
  );
  const orgOneMembership = await systemDb.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgOneId,
        userId: orgOneOwner?.id ?? "",
      },
    },
  });
  expect(
    orgOneMembership?.status === "INVITED",
    "owner membership starts as INVITED",
  );
  const orgOneInvite = await systemDb.invitation.findFirst({
    where: { organizationId: orgOneId },
  });
  expect(orgOneInvite !== null, "an invitation was issued for the owner");
  expect(
    (orgOneInvite?.tokenHash.length ?? 0) === 64,
    "invitation token is stored as a sha256 hash",
  );

  const detailOne = await getOrganizationDetail(orgOneId);
  expect(detailOne !== null, "Test Co detail resolves");
  expect(detailOne?.memberCount === 1, "Test Co starts with one member");
  expect(
    detailOne?.members[0]?.roleKey === "owner" &&
      detailOne?.members[0]?.email === "test-owner@sa.test",
    "Test Co owner membership exists",
  );
  expect(
    (detailOne?.modules.length ?? 0) > 0 &&
      (detailOne?.modules ?? []).every((m) => !m.isCore || m.enabled),
    "Test Co modules exist and core modules are enabled",
  );
  expect(
    detailOne?.modules.some((m) => !m.isCore && !m.enabled) === true,
    "Test Co non-core modules start disabled",
  );
  expect(
    detailOne?.templateKey === "general",
    "Test Co defaults to the general template",
  );
  expect(
    detailOne?.modules.find((m) => m.key === "crm")?.enabled === true,
    "the general template enables its default modules",
  );
  const generalRoles = await systemDb.role.count({
    where: { organizationId: orgOneId, isSystem: false },
  });
  expect(
    generalRoles === 0,
    "the general template seeds no custom roles",
  );

  const createdAudit = await systemDb.platformAuditLog.findFirst({
    where: { organizationId: orgOneId, action: "organization.created" },
  });
  expect(createdAudit !== null, "organization.created audit row is written");

  const duplicateSlug = await createOrganization(actor, {
    name: "Duplicate Co",
    slug: "test-co",
    businessType: "test",
    ownerName: "Owner",
    ownerEmail: "dup-owner@sa.test",
  });
  expect(
    duplicateSlug.ok === false &&
      duplicateSlug.errorKey === SUPER_ADMIN_ERRORS.slugTaken,
    "createOrganization rejects a duplicate slug",
  );

  const platformSlug = await createOrganization(actor, {
    name: "Platform Imposter",
    slug: "platform-hq",
    businessType: "test",
    ownerName: "Owner",
    ownerEmail: "platform-imposter@sa.test",
  });
  expect(
    platformSlug.ok === false &&
      platformSlug.errorKey === SUPER_ADMIN_ERRORS.slugTaken,
    "createOrganization cannot take the platform slug",
  );

  const orgTwo = await createOrganization(actor, {
    name: "Second Co",
    slug: "second-co",
    businessType: "testing",
    templateKey: "retail",
    ownerName: "Tess Owner",
    ownerEmail: "test-owner@sa.test",
  });
  expect(
    orgTwo.ok === true && orgTwo.id,
    "createOrganization reuses an existing owner without a password",
  );
  const orgTwoId = orgTwo.id!;

  const orgTwoDetail = await getOrganizationDetail(orgTwoId);
  expect(
    orgTwoDetail?.templateKey === "retail",
    "Second Co is created with the retail template",
  );
  expect(
    orgTwoDetail?.modules.find((m) => m.key === "products")?.enabled === true,
    "the retail template enables its default modules",
  );
  expect(
    orgTwoDetail?.modules.find((m) => m.key === "inventory")?.enabled === true,
    "the retail template enables inventory",
  );
  const retailRole = await systemDb.role.findFirst({
    where: { organizationId: orgTwoId, key: "store-manager" },
  });
  expect(retailRole !== null, "the retail template seeds a store-manager role");
  const retailRolePermissions = retailRole
    ? await systemDb.rolePermission.count({ where: { roleId: retailRole.id } })
    : 0;
  expect(
    retailRolePermissions > 0,
    "the seeded custom role grants permissions",
  );

  const afterCreates = await getPlatformMetrics();
  expect(
    afterCreates.totalOrganizations === 5,
    "client organization count grows to 5 after test creates",
  );
  const afterCreateList = await listOrganizations();
  expect(afterCreateList.length === 5, "list shows 5 organizations");

  const updated = await updateOrganization(actor, orgOneId, {
    name: "Test Co Renamed",
    slug: "test-co",
    businessType: "quality assurance",
    timezone: "UTC",
    currency: "USD",
    dateFormat: "yyyy-MM-dd",
  });
  expect(updated.ok === true, "updateOrganization updates Test Co");
  const renamed = await getOrganizationDetail(orgOneId);
  expect(
    renamed?.name === "Test Co Renamed" &&
      renamed.businessType === "quality assurance",
    "Test Co detail reflects the update",
  );

  const slugClash = await updateOrganization(actor, orgOneId, {
    name: "Test Co Renamed",
    slug: "second-co",
    businessType: "quality assurance",
    timezone: "UTC",
    currency: "USD",
    dateFormat: "yyyy-MM-dd",
  });
  expect(
    slugClash.ok === false && slugClash.errorKey === SUPER_ADMIN_ERRORS.slugTaken,
    "updateOrganization rejects a conflicting slug",
  );

  const platformUpdate = await updateOrganization(actor, platformOrgId, {
    name: "Hijack",
    slug: "platform-hq",
    businessType: "x",
    timezone: "UTC",
    currency: "USD",
    dateFormat: "yyyy-MM-dd",
  });
  expect(
    platformUpdate.ok === false &&
      platformUpdate.errorKey === SUPER_ADMIN_ERRORS.notFound,
    "updateOrganization cannot touch the platform organization",
  );

  const badColor = await updateBranding(actor, orgOneId, {
    primaryColor: "red",
    secondaryColor: "",
    logo: "",
    favicon: "",
  });
  expect(
    badColor.ok === false && badColor.errorKey === SUPER_ADMIN_ERRORS.invalidColor,
    "updateBranding rejects an invalid color",
  );
  const branded = await updateBranding(actor, orgOneId, {
    primaryColor: "#ff0000",
    secondaryColor: "#00ff00",
    logo: "",
    favicon: "",
  });
  expect(branded.ok === true, "updateBranding applies valid colors");
  const brandDetail = await getOrganizationDetail(orgOneId);
  expect(
    brandDetail?.primaryColor === "#ff0000" &&
      brandDetail.secondaryColor === "#00ff00",
    "branding colors persist on the detail",
  );

  const badStatus = await setOrganizationStatus(actor, orgOneId, "FROZEN");
  expect(
    badStatus.ok === false &&
      badStatus.errorKey === SUPER_ADMIN_ERRORS.invalidStatus,
    "setOrganizationStatus rejects an unknown status",
  );
  const suspended = await setOrganizationStatus(actor, orgOneId, "SUSPENDED");
  expect(suspended.ok === true, "setOrganizationStatus suspends Test Co");
  const suspendedDetail = await getOrganizationDetail(orgOneId);
  expect(
    suspendedDetail?.status === "SUSPENDED",
    "Test Co detail shows SUSPENDED",
  );
  await setOrganizationStatus(actor, orgOneId, "SUSPENDED");
  const suspendedAudits = await systemDb.platformAuditLog.count({
    where: { organizationId: orgOneId, action: "organization.suspended" },
  });
  expect(suspendedAudits === 1, "repeat suspension does not duplicate audit rows");
  const activated = await setOrganizationStatus(actor, orgOneId, "ACTIVE");
  expect(activated.ok === true, "setOrganizationStatus reactivates Test Co");

  const moduleRows = await systemDb.module.findMany();
  const coreModule = moduleRows.find((m) => m.isCore);
  const optionalModule = moduleRows.find((m) => !m.isCore);
  if (!coreModule || !optionalModule) {
    throw new Error("FAIL: seed modules missing core and optional modules");
  }

  const coreDisable = await setModuleEnabled(
    actor,
    orgOneId,
    coreModule.key,
    false,
  );
  expect(
    coreDisable.ok === false && coreDisable.errorKey === SUPER_ADMIN_ERRORS.coreModule,
    "core modules cannot be disabled",
  );
  const moduleOn = await setModuleEnabled(
    actor,
    orgOneId,
    optionalModule.key,
    true,
  );
  expect(moduleOn.ok === true, `module ${optionalModule.key} enabled`);
  const enabledDetail = await getOrganizationDetail(orgOneId);
  expect(
    enabledDetail?.modules.find((m) => m.key === optionalModule.key)?.enabled ===
      true,
    "detail reflects the enabled module",
  );
  const moduleAudit = await systemDb.platformAuditLog.findFirst({
    where: {
      organizationId: orgOneId,
      action: "module.enabled",
      metadata: { path: ["module"], equals: optionalModule.name },
    },
  });
  expect(moduleAudit !== null, "module.enabled audit row includes the module");
  const moduleOff = await setModuleEnabled(
    actor,
    orgOneId,
    optionalModule.key,
    false,
  );
  expect(moduleOff.ok === true, `module ${optionalModule.key} disabled`);

  const invalidPlan = await assignPlan(actor, orgOneId, "NOT_A_PLAN");
  expect(
    invalidPlan.ok === false &&
      invalidPlan.errorKey === SUPER_ADMIN_ERRORS.invalidPlan,
    "assignPlan rejects an unknown plan key",
  );
  const starterAssign = await assignPlan(actor, orgOneId, "STARTER");
  expect(starterAssign.ok === true, "assignPlan assigns STARTER to Test Co");
  const starterDetail = await getOrganizationDetail(orgOneId);
  expect(
    starterDetail?.subscription?.planKey === "STARTER" &&
      starterDetail.subscription.state === "ACTIVE",
    "STARTER subscription is active with no trial",
  );
  const samePlan = await assignPlan(actor, orgOneId, "STARTER");
  expect(
    samePlan.ok === false && samePlan.errorKey === SUPER_ADMIN_ERRORS.samePlan,
    "assignPlan rejects reassigning the same plan",
  );
  const businessAssign = await assignPlan(actor, orgOneId, "BUSINESS");
  expect(businessAssign.ok === true, "assignPlan switches Test Co to BUSINESS");
  const planChangeAudit = await systemDb.platformAuditLog.findFirst({
    where: { organizationId: orgOneId, action: "subscription.planChanged" },
    orderBy: { createdAt: "desc" },
  });
  expect(
    planChangeAudit?.summary ===
      "Super Admin changed Test Co Renamed's plan from Starter to Business.",
    "planChanged audit stores the exact change summary",
  );
  expect(
    planChangeAudit !== null &&
      planChangeAudit.metadata !== null &&
      typeof planChangeAudit.metadata === "object" &&
      (planChangeAudit.metadata as Record<string, unknown>).from === "Starter" &&
      (planChangeAudit.metadata as Record<string, unknown>).to === "Business",
    "planChanged audit metadata carries from and to plan names",
  );

  const startTrialResult = await startTrial(actor, orgOneId, 7);
  expect(startTrialResult.ok === true, "startTrial starts a 7 day trial");
  const trialDetail = await getOrganizationDetail(orgOneId);
  expect(
    trialDetail?.subscription?.state === "TRIAL",
    "subscription state becomes TRIAL",
  );
  const trialEnd = trialDetail?.subscription?.trialEndsAt
    ? new Date(trialDetail.subscription.trialEndsAt).getTime()
    : 0;
  const trialSkew = Math.abs(trialEnd - (Date.now() + 7 * 24 * 60 * 60 * 1000));
  expect(trialSkew < 60 * 1000, "trial ends about 7 days from now");

  const tooManyDays = await startTrial(actor, orgOneId, 999);
  expect(
    tooManyDays.ok === false &&
      tooManyDays.errorKey === SUPER_ADMIN_ERRORS.invalidDays,
    "startTrial rejects out of range days",
  );

  const extendResult = await extendTrial(actor, orgOneId, 3);
  expect(extendResult.ok === true, "extendTrial adds 3 days to the trial");
  const extendedDetail = await getOrganizationDetail(orgOneId);
  const extendedEnd = extendedDetail?.subscription?.trialEndsAt
    ? new Date(extendedDetail.subscription.trialEndsAt).getTime()
    : 0;
  const expectedExtended = trialEnd + 3 * 24 * 60 * 60 * 1000;
  expect(
    Math.abs(extendedEnd - expectedExtended) < 60 * 1000,
    "extendTrial extends from the existing trial end",
  );

  const subSuspended = await suspendSubscription(actor, orgOneId);
  expect(subSuspended.ok === true, "suspendSubscription suspends Test Co");
  const subSuspendDetail = await getOrganizationDetail(orgOneId);
  expect(
    subSuspendDetail?.subscription?.state === "SUSPENDED" &&
      subSuspendDetail.subscription.endedAt !== null,
    "suspended subscription records endedAt",
  );
  const suspendedAgain = await suspendSubscription(actor, orgOneId);
  expect(
    suspendedAgain.ok === false &&
      suspendedAgain.errorKey === SUPER_ADMIN_ERRORS.alreadySuspended,
    "suspending twice reports alreadySuspended",
  );
  const trialOnSuspended = await startTrial(actor, orgOneId, 5);
  expect(
    trialOnSuspended.ok === false &&
      trialOnSuspended.errorKey === SUPER_ADMIN_ERRORS.suspendedSubscription,
    "trials cannot start on a suspended subscription",
  );

  const reactivated = await reactivateSubscription(actor, orgOneId);
  expect(reactivated.ok === true, "reactivateSubscription restores Test Co");
  const activeDetail = await getOrganizationDetail(orgOneId);
  expect(
    activeDetail?.subscription?.state === "ACTIVE" &&
      activeDetail.subscription.trialEndsAt === null &&
      activeDetail.subscription.endedAt === null,
    "reactivated subscription clears trial and endedAt",
  );
  const reactivateAgain = await reactivateSubscription(actor, orgOneId);
  expect(
    reactivateAgain.ok === false &&
      reactivateAgain.errorKey === SUPER_ADMIN_ERRORS.notSuspended,
    "reactivating an active subscription reports notSuspended",
  );
  const extendActive = await extendTrial(actor, orgOneId, 5);
  expect(
    extendActive.ok === false && extendActive.errorKey === SUPER_ADMIN_ERRORS.notTrial,
    "extendTrial rejects subscriptions that are not on a trial",
  );

  const addExisting = await addMember(actor, orgOneId, {
    email: "test-owner@sa.test",
    name: "",
    password: "",
    roleKey: "viewer",
  });
  expect(
    addExisting.ok === false &&
      addExisting.errorKey === SUPER_ADMIN_ERRORS.memberExists,
    "addMember rejects users who are already members",
  );
  const addBadRole = await addMember(actor, orgOneId, {
    email: "intruder@sa.test",
    name: "Intruder",
    password: "Password123!",
    roleKey: "super_admin",
  });
  expect(
    addBadRole.ok === false && addBadRole.errorKey === SUPER_ADMIN_ERRORS.invalidRole,
    "addMember rejects the super_admin role",
  );
  const addShort = await addMember(actor, orgOneId, {
    email: "newbie@sa.test",
    name: "New Bie",
    password: "short",
    roleKey: "viewer",
  });
  expect(
    addShort.ok === false && addShort.errorKey === SUPER_ADMIN_ERRORS.passwordShort,
    "addMember requires a long password for new users",
  );
  const addStaff = await addMember(actor, orgOneId, {
    email: "staff-user@sa.test",
    name: "Stef Staff",
    password: "Password123!",
    roleKey: "staff",
  });
  expect(addStaff.ok === true, "addMember creates a staff user");
  const staffDetail = await getOrganizationDetail(orgOneId);
  const staffMember = staffDetail?.members.find(
    (m) => m.email === "staff-user@sa.test",
  );
  expect(
    staffMember !== undefined && staffMember.roleKey === "staff",
    "detail shows the new staff member",
  );

  const members = staffDetail?.members ?? [];
  const ownerMember = members.find((m) => m.roleKey === "owner");
  if (!ownerMember || !staffMember) {
    throw new Error("FAIL: expected owner and staff members to exist");
  }

  const demoteSoleOwner = await updateMemberRole(
    actor,
    orgOneId,
    ownerMember.id,
    "viewer",
  );
  expect(
    demoteSoleOwner.ok === false &&
      demoteSoleOwner.errorKey === SUPER_ADMIN_ERRORS.lastOwner,
    "the sole owner cannot be demoted",
  );
  const removeSoleOwner = await removeMember(actor, orgOneId, ownerMember.id);
  expect(
    removeSoleOwner.ok === false &&
      removeSoleOwner.errorKey === SUPER_ADMIN_ERRORS.lastOwner,
    "the sole owner cannot be removed",
  );
  const promoteStaff = await updateMemberRole(
    actor,
    orgOneId,
    staffMember.id,
    "manager",
  );
  expect(promoteStaff.ok === true, "staff member can be promoted to manager");
  const roleAudit = await systemDb.platformAuditLog.findFirst({
    where: {
      organizationId: orgOneId,
      action: "member.roleChanged",
      metadata: { path: ["email"], equals: "staff-user@sa.test" },
    },
  });
  expect(roleAudit !== null, "member.roleChanged audit row is written");
  const removeStaff = await removeMember(actor, orgOneId, staffMember.id);
  expect(removeStaff.ok === true, "staff member can be removed");
  const removedAgain = await removeMember(actor, orgOneId, staffMember.id);
  expect(
    removedAgain.ok === false && removedAgain.errorKey === SUPER_ADMIN_ERRORS.notFound,
    "removing a member twice reports notFound",
  );

  const noSubOrg = await getOrganizationDetail(orgTwoId);
  expect(noSubOrg?.subscription === null, "Second Co has no subscription yet");
  const trialOnEmpty = await startTrial(actor, orgTwoId, 10);
  expect(
    trialOnEmpty.ok === false &&
      trialOnEmpty.errorKey === SUPER_ADMIN_ERRORS.subscriptionMissing,
    "startTrial reports a missing subscription",
  );

  const auditCount = await systemDb.platformAuditLog.count({
    where: { organizationId: { in: [orgOneId, orgTwoId] } },
  });
  expect(auditCount >= 10, "super admin actions accumulate audit rows");

  await systemDb.platformAuditLog.deleteMany({
    where: { organizationId: { in: [orgOneId, orgTwoId] } },
  });
  await systemDb.organization.deleteMany({
    where: { id: { in: [orgOneId, orgTwoId] } },
  });
  await systemDb.user.deleteMany({
    where: {
      email: { in: ["test-owner@sa.test", "staff-user@sa.test"] },
    },
  });

  const after = await getPlatformMetrics();
  expect(after.totalOrganizations === before.totalOrganizations, "cleanup restores organization count");
  expect(after.activeOrganizations === before.activeOrganizations, "cleanup restores active organization count");
  expect(after.trialOrganizations === before.trialOrganizations, "cleanup restores trial count");
  expect(after.suspendedOrganizations === before.suspendedOrganizations, "cleanup restores suspended count");
  expect(after.totalUsers === before.totalUsers, "cleanup restores user count");
  expect(after.activeSubscriptions === before.activeSubscriptions, "cleanup restores subscription count");
  expect(after.mrrCents === before.mrrCents, "cleanup restores MRR");
  const afterList = await listOrganizations();
  expect(afterList.length === 3, "cleanup restores the 3 seeded organizations");
  expect(
    afterList.some((row) => row.slug === "acme-bakery") &&
      afterList.some((row) => row.slug === "globex-corp") &&
      afterList.some((row) => row.slug === "vertex-studio"),
    "seeded organizations remain untouched",
  );
  const remainingTestAudit = await systemDb.platformAuditLog.count({
    where: { organizationId: { in: [orgOneId, orgTwoId] } },
  });
  expect(remainingTestAudit === 0, "cleanup removes test audit rows");

  console.log("PASS: all super admin checks passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
