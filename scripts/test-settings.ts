import "@/server/db/env-loader";

import { AuthError } from "@/server/auth/errors";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from "@/server/auth/permissions";
import type { OrganizationContext } from "@/server/auth/guards";
import { systemDb } from "@/server/db";
import {
  addSettingMember,
  changeSettingMemberRole,
  createSettingRole,
  deleteSettingRole,
  getBrandingSettings,
  getBusinessSettings,
  listSettingMembers,
  listSettingModules,
  listSettingRoles,
  removeSettingMember,
  setSettingModuleEnabled,
  updateBranding,
  updateBusiness,
  updateSettingRole,
} from "@/server/services/settings";
import { lookupTenantBranding } from "@/server/tenant-branding";
import {
  DEFAULT_AUTH_LOGO,
  PRODUCT_NAME,
  buildBrandVars,
  loginDisplayLogo,
  resolveTenantBranding,
} from "@/utils/branding";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TokenFile {
  ownerA: {
    token: string;
    email: string;
    organizationId: string;
    organizationSlug: string;
  };
  ownerB: {
    token: string;
    email: string;
    organizationId: string;
    organizationSlug: string;
  };
  viewerA: {
    token: string;
    email: string;
    organizationId: string;
    organizationSlug: string;
  };
}

function loadTokenFile(): TokenFile {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "prisma/.test-tokens.json"), "utf8"),
  );
}

let passed = 0;
let failed = 0;

function expect(condition: unknown, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL: ${label}`);
  }
}

async function expectThrows(
  label: string,
  fn: () => Promise<unknown>,
  check?: (error: unknown) => boolean,
): Promise<void> {
  try {
    await fn();
    failed += 1;
    console.log(`FAIL: ${label} (no error thrown)`);
  } catch (error) {
    const ok = check ? check(error) : true;
    if (ok) {
      passed += 1;
      console.log(`PASS: ${label}`);
    } else {
      failed += 1;
      console.log(`FAIL: ${label} (unexpected error: ${String(error)})`);
    }
  }
}

function ctxFor(
  organizationId: string,
  roleKey: "owner" | "viewer" | "staff",
  actorId: string,
): OrganizationContext {
  const permissions: PermissionKey[] = [...ROLE_PERMISSIONS[roleKey]];
  return {
    user: {
      id: actorId,
      email: "actor@org-a.test",
      name: "Settings Tester",
      avatarUrl: null,
    },
    organization: {
      id: organizationId,
      slug: "acme-bakery",
      name: "Acme Bakery",
      logo: null,
      favicon: null,
      primaryColor: null,
      secondaryColor: null,
      businessType: null,
      timezone: "UTC",
      currency: "USD",
      dateFormat: "yyyy-MM-dd",
      status: "ACTIVE",
      templateKey: "retail",
    },
    membership: {
      id: "membership-test",
      roleId: `role-${roleKey}`,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    role: {
      id: `role-${roleKey}`,
      key: roleKey,
      name: roleKey,
      isSystem: true,
    },
    permissions,
    modules: ["crm", "sales", "tasks", "projects", "finance", "reports", "settings"],
    subscription: null,
    session: { id: "session-test", expiresAt: new Date(Date.now() + 60_000) },
  } as OrganizationContext;
}

async function main() {
  const tokens = loadTokenFile();
  const orgId = tokens.ownerA.organizationId;
  const ownerUser = await systemDb.user.findUnique({
    where: { email: tokens.ownerA.email },
  });
  if (!ownerUser) {
    throw new Error("ownerA user not found");
  }
  const ownerCtx = ctxFor(orgId, "owner", ownerUser.id);
  const viewerUser = await systemDb.user.findUnique({
    where: { email: tokens.viewerA.email },
  });
  const viewerCtx = viewerUser
    ? ctxFor(orgId, "viewer", viewerUser.id)
    : null;

  const originalOrg = await systemDb.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      name: true,
      businessType: true,
      currency: true,
      timezone: true,
      dateFormat: true,
      logo: true,
      favicon: true,
      loginLogo: true,
      loginBackground: true,
      primaryColor: true,
      secondaryColor: true,
    },
  });

  const testEmail = "settings-test-user@org-a.test";
  let createdMemberId: string | null = null;
  let createdUserId: string | null = null;
  let createdRoleId: string | null = null;
  let crmTouched = false;

  try {
    console.log("--- branding utilities ---");
    const defaultVars = buildBrandVars(null, null);
    expect(defaultVars["--brand-primary"] === "#465fff", "default primary is #465fff");
    expect(typeof defaultVars["--brand-secondary"] === "string", "secondary var is set");
    expect(
      typeof defaultVars["--brand-background"] === "string",
      "background var is set",
    );
    expect(
      defaultVars["--brand-background"] === defaultVars["--color-brand-25"],
      "background var mirrors brand-25 tint",
    );

    const acmeVars = buildBrandVars("#12b76a", null);
    expect(acmeVars["--brand-primary"] === "#12b76a", "custom primary respected");
    expect(
      acmeVars["--brand-secondary"] !== "#12b76a",
      "secondary derived from primary when missing",
    );
    expect(
      acmeVars["--color-brand-500"] === "#12b76a",
      "scale 500 equals primary",
    );
    expect(
      acmeVars["--brand-background"] !== acmeVars["--brand-primary"],
      "background tint differs from primary",
    );

    const invalidVars = buildBrandVars("not-a-color", "also-bad");
    expect(
      invalidVars["--brand-primary"] === "#465fff",
      "invalid primary falls back to default",
    );
    expect(
      invalidVars["--brand-secondary"] !== "also-bad",
      "invalid secondary is replaced",
    );

    const fallback = resolveTenantBranding(null);
    expect(fallback.name === PRODUCT_NAME, `fallback name is ${PRODUCT_NAME}`);
    expect(fallback.logo === DEFAULT_AUTH_LOGO, "fallback logo is product logo");
    expect(fallback.primaryColor === "#465fff", "fallback primary color");

    const custom = resolveTenantBranding({
      name: "  Acme  ",
      logo: "/branding/org-a.svg",
      primaryColor: "#12b76a",
      secondaryColor: "bogus",
      loginLogo: "/branding/acme-login.svg",
    });
    expect(custom.name === "Acme", "name trimmed");
    expect(custom.primaryColor === "#12b76a", "custom primary kept");
    expect(/^#[0-9a-fA-F]{6}$/.test(custom.secondaryColor), "invalid secondary derived");
    expect(custom.loginLogo === "/branding/acme-login.svg", "login logo kept");

    expect(
      loginDisplayLogo({
        ...custom,
        loginLogo: "/x/login.svg",
      }) === "/x/login.svg",
      "loginDisplayLogo prefers loginLogo",
    );
    expect(
      loginDisplayLogo({ ...custom, loginLogo: null }) === "/branding/org-a.svg",
      "loginDisplayLogo falls back to logo",
    );

    console.log("--- tenant login resolution ---");
    const acmeLogin = await lookupTenantBranding({ org: "acme-bakery" });
    expect(acmeLogin.name === "Acme Bakery", "slug resolves Acme Bakery");
    expect(acmeLogin.primaryColor === "#465fff", "Acme primary from db");
    expect(acmeLogin.loginLogo === "/branding/org-a.svg", "Acme login logo seeded");
    expect(
      acmeLogin.loginBackground === "/branding/login-bg.svg",
      "Acme login background seeded",
    );

    const globexLogin = await lookupTenantBranding({ org: "globex-corp" });
    expect(globexLogin.primaryColor === "#12b76a", "Globex primary from db");

    const unknownLogin = await lookupTenantBranding({ org: "does-not-exist" });
    expect(unknownLogin.name === PRODUCT_NAME, "unknown slug falls back to product");
    expect(unknownLogin.primaryColor === "#465fff", "unknown slug default color");

    const emptyLogin = await lookupTenantBranding({});
    expect(emptyLogin.name === PRODUCT_NAME, "no tenant context falls back");

    const subdomainLogin = await lookupTenantBranding({
      host: "acme-bakery.localhost:3000",
    });
    expect(subdomainLogin.name === "Acme Bakery", "subdomain host resolves tenant");

    const platformLogin = await lookupTenantBranding({ org: "platform-hq" });
    expect(
      platformLogin.name === PRODUCT_NAME,
      "platform organization is not resolvable for login branding",
    );

    console.log("--- business settings ---");
    const business = getBusinessSettings(ownerCtx);
    expect(business.slug === "acme-bakery", "reads business settings");
    expect(
      getBusinessSettings(viewerCtx as OrganizationContext).name.length > 0,
      "viewer can read business settings",
    );

    const businessResult = await updateBusiness(ownerCtx, {
      name: "Acme Bakery HQ",
      businessType: "Retail bakery",
      currency: "eur",
      timezone: "Europe/Paris",
      dateFormat: "dd/MM/yyyy",
    });
    expect(businessResult.ok, "owner can update business settings");
    const afterBusiness = await systemDb.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        name: true,
        currency: true,
        timezone: true,
        dateFormat: true,
      },
    });
    expect(afterBusiness.name === "Acme Bakery HQ", "company name persisted");
    expect(afterBusiness.currency === "EUR", "currency normalized to uppercase");
    expect(afterBusiness.timezone === "Europe/Paris", "timezone persisted");
    expect(afterBusiness.dateFormat === "dd/MM/yyyy", "date format persisted");

    const badCurrency = await updateBusiness(ownerCtx, {
      name: "Acme Bakery HQ",
      currency: "US",
    });
    expect(!badCurrency.ok && badCurrency.errorKey?.includes("invalidCurrency"), "invalid currency rejected");
    const badTimezone = await updateBusiness(ownerCtx, {
      name: "Acme Bakery HQ",
      timezone: "Bad Zone",
    });
    expect(!badTimezone.ok && badTimezone.errorKey?.includes("invalidTimezone"), "invalid timezone rejected");
    const badFormat = await updateBusiness(ownerCtx, {
      name: "Acme Bakery HQ",
      dateFormat: "nope",
    });
    expect(!badFormat.ok && badFormat.errorKey?.includes("invalidDateFormat"), "invalid date format rejected");
    const emptyName = await updateBusiness(ownerCtx, { name: "  " });
    expect(!emptyName.ok && emptyName.errorKey?.includes("required"), "empty company name rejected");

    if (viewerCtx) {
      const viewerWrite = await updateBusiness(viewerCtx, { name: "Hacked" });
      expect(
        !viewerWrite.ok && viewerWrite.errorKey?.includes("forbidden"),
        "viewer cannot update business settings",
      );
    }

    console.log("--- branding settings ---");
    const brandingBefore = await getBrandingSettings(ownerCtx);
    expect(
      brandingBefore.logo === originalOrg.logo,
      "branding read matches stored logo",
    );

    const brandingResult = await updateBranding(ownerCtx, {
      logo: "/branding/org-a.svg",
      favicon: "/branding/org-a.svg",
      loginLogo: "/branding/org-a.svg",
      loginBackground: "/branding/login-bg.svg",
      primaryColor: "#465fff",
      secondaryColor: "#2e90fa",
    });
    expect(brandingResult.ok, "owner can update branding");
    const brandingAfter = await getBrandingSettings(ownerCtx);
    expect(brandingAfter.primaryColor === "#465fff", "primary color persisted");
    expect(brandingAfter.loginBackground === "/branding/login-bg.svg", "login background persisted");

    const badColor = await updateBranding(ownerCtx, { primaryColor: "#zzzzzz" });
    expect(!badColor.ok && badColor.errorKey?.includes("invalidColor"), "invalid color rejected");
    const badUrl = await updateBranding(ownerCtx, { logo: "javascript:alert(1)" });
    expect(!badUrl.ok && badUrl.errorKey?.includes("invalidUrl"), "unsafe image url rejected");
    const remoteOk = await updateBranding(ownerCtx, {
      logo: "https://cdn.example.com/logo.png",
    });
    expect(remoteOk.ok, "https image url accepted");
    const cleared = await updateBranding(ownerCtx, { logo: "" });
    expect(cleared.ok, "clearing a branding field succeeds");
    expect(
      (await getBrandingSettings(ownerCtx)).logo === null,
      "cleared branding field stored as null",
    );

    if (viewerCtx) {
      const viewerBranding = await updateBranding(viewerCtx, {
        primaryColor: "#000000",
      });
      expect(
        !viewerBranding.ok && viewerBranding.errorKey?.includes("forbidden"),
        "viewer cannot update branding",
      );
    }

    console.log("--- members ---");
    const addResult = await addSettingMember(ownerCtx, {
      name: "Settings Test User",
      email: testEmail,
      password: "Password123!",
      roleKey: "viewer",
    });
    expect(addResult.ok, "owner can add a member");
    createdMemberId = addResult.id ?? null;
    const testUser = await systemDb.user.findUnique({ where: { email: testEmail } });
    createdUserId = testUser?.id ?? null;
    expect(createdMemberId !== null && testUser !== null, "member and user created");

    const duplicate = await addSettingMember(ownerCtx, {
      email: testEmail,
      roleKey: "viewer",
    });
    expect(!duplicate.ok && duplicate.errorKey?.includes("memberExists"), "duplicate member rejected");

    const badEmail = await addSettingMember(ownerCtx, {
      email: "not-an-email",
      roleKey: "viewer",
    });
    expect(!badEmail.ok && badEmail.errorKey?.includes("invalidEmail"), "invalid email rejected");

    const shortPassword = await addSettingMember(ownerCtx, {
      name: "Another User",
      email: "settings-test-short@org-a.test",
      password: "short",
      roleKey: "viewer",
    });
    expect(!shortPassword.ok && shortPassword.errorKey?.includes("passwordShort"), "short password rejected");
    const badRole = await addSettingMember(ownerCtx, {
      email: "settings-test-role@org-a.test",
      roleKey: "not-a-role",
    });
    expect(!badRole.ok && badRole.errorKey?.includes("invalidRole"), "invalid role rejected");

    if (viewerCtx && createdMemberId) {
      const viewerAdd = await addSettingMember(viewerCtx, {
        email: "settings-test-x@org-a.test",
        roleKey: "viewer",
      });
      expect(
        !viewerAdd.ok && viewerAdd.errorKey?.includes("forbidden"),
        "viewer cannot add members",
      );
    }

    console.log("--- roles ---");
    const createRole = await createSettingRole(ownerCtx, {
      name: "Content Reviewer",
      key: "content-reviewer",
      permissionKeys: [PERMISSIONS.MODULES_READ, PERMISSIONS.SETTINGS_READ],
    });
    expect(createRole.ok, "owner can create a custom role");
    createdRoleId = createRole.id ?? null;
    expect(createdRoleId !== null, "custom role id returned");

    const duplicateRole = await createSettingRole(ownerCtx, {
      name: "Content Reviewer 2",
      key: "content-reviewer",
      permissionKeys: [],
    });
    expect(!duplicateRole.ok && duplicateRole.errorKey?.includes("roleKeyTaken"), "duplicate role key rejected");

    const systemKeyRole = await createSettingRole(ownerCtx, {
      name: "Fake Owner",
      key: "owner",
      permissionKeys: [],
    });
    expect(!systemKeyRole.ok && systemKeyRole.errorKey?.includes("roleKeyTaken"), "system role key rejected");

    const badKeyRole = await createSettingRole(ownerCtx, {
      name: "Bad Key",
      key: "Bad Key!",
      permissionKeys: [],
    });
    expect(!badKeyRole.ok && badKeyRole.errorKey?.includes("roleKeyInvalid"), "malformed role key rejected");

    const badPermissionRole = await createSettingRole(ownerCtx, {
      name: "Bad Permission",
      key: "bad-permission",
      permissionKeys: ["made.up.permission"],
    });
    expect(!badPermissionRole.ok && badPermissionRole.errorKey?.includes("invalidRole"), "unknown permission rejected");

    if (createdRoleId) {
      const updateRole = await updateSettingRole(ownerCtx, createdRoleId, {
        name: "Content Reviewer Lead",
        permissionKeys: [PERMISSIONS.SETTINGS_READ],
      });
      expect(updateRole.ok, "owner can update a custom role");
      const rolesData = await listSettingRoles(ownerCtx);
      const updated = rolesData.roles.find((role) => role.id === createdRoleId);
      expect(updated?.name === "Content Reviewer Lead", "role name persisted");
      expect(
        updated?.permissions.length === 1 &&
          updated.permissions[0] === PERMISSIONS.SETTINGS_READ,
        "role permissions replaced",
      );
      expect(
        rolesData.roles.some((role) => role.isSystem && role.key === "owner"),
        "system roles listed read-only",
      );
      expect(
        rolesData.permissionGroups.length > 0,
        "permission catalog grouped",
      );
    }

    const systemRole = await systemDb.role.findFirst({
      where: { organizationId: null, key: "owner", isSystem: true },
      select: { id: true },
    });
    if (systemRole) {
      const deleteSystem = await deleteSettingRole(ownerCtx, systemRole.id);
      expect(
        !deleteSystem.ok && deleteSystem.errorKey?.includes("roleSystem"),
        "system role cannot be deleted",
      );
    }

    if (viewerCtx) {
      const viewerCreate = await createSettingRole(viewerCtx, {
        name: "Viewer Role",
        key: "viewer-role",
        permissionKeys: [],
      });
      expect(
        !viewerCreate.ok && viewerCreate.errorKey?.includes("forbidden"),
        "viewer cannot create roles",
      );
      await expectThrows(
        "viewer cannot read roles",
        () => listSettingRoles(viewerCtx),
        (error) => error instanceof AuthError && error.code === "FORBIDDEN",
      );
      await expectThrows(
        "viewer cannot read members",
        () => listSettingMembers(viewerCtx),
        (error) => error instanceof AuthError && error.code === "FORBIDDEN",
      );
    }

    console.log("--- member role changes and removal ---");
    if (createdMemberId) {
      const roleChange = await changeSettingMemberRole(
        ownerCtx,
        createdMemberId,
        createdRoleId ? "content-reviewer" : "staff",
      );
      expect(roleChange.ok, "owner can change a member role");
      const membersData = await listSettingMembers(ownerCtx);
      const changed = membersData.members.find(
        (member) => member.id === createdMemberId,
      );
      expect(
        changed?.roleKey === (createdRoleId ? "content-reviewer" : "staff"),
        "member role persisted",
      );
      expect(
        membersData.roleOptions.some((role) => role.key === "content-reviewer"),
        "custom role available as member role option",
      );

      if (createdRoleId) {
        const deleteInUse = await deleteSettingRole(ownerCtx, createdRoleId);
        expect(
          !deleteInUse.ok && deleteInUse.errorKey?.includes("roleInUse"),
          "role in use cannot be deleted",
        );
      }

      const backToStaff = await changeSettingMemberRole(
        ownerCtx,
        createdMemberId,
        "staff",
      );
      expect(backToStaff.ok, "member role changed back");
    }

    const ownerMember = await systemDb.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        role: { key: "owner" },
      },
      select: { id: true },
    });
    if (ownerMember) {
      const demoteOwner = await changeSettingMemberRole(
        ownerCtx,
        ownerMember.id,
        "staff",
      );
      expect(
        !demoteOwner.ok && demoteOwner.errorKey?.includes("lastOwner"),
        "last owner cannot be demoted",
      );
      const removeOwner = await removeSettingMember(ownerCtx, ownerMember.id);
      expect(
        !removeOwner.ok && removeOwner.errorKey?.includes("lastOwner"),
        "last owner cannot be removed",
      );
    }

    if (createdRoleId) {
      const deleteRole = await deleteSettingRole(ownerCtx, createdRoleId);
      expect(deleteRole.ok, "custom role deleted after reassignment");
      createdRoleId = null;
    }

    if (createdMemberId) {
      const removeMember = await removeSettingMember(ownerCtx, createdMemberId);
      expect(removeMember.ok, "owner can remove a member");
      const gone = await systemDb.organizationMember.findUnique({
        where: { id: createdMemberId },
      });
      expect(gone === null, "member row deleted");
      createdMemberId = null;
    }

    if (viewerCtx) {
      const viewerRemove = await removeSettingMember(
        viewerCtx,
        "any-member-id",
      );
      expect(
        !viewerRemove.ok && viewerRemove.errorKey?.includes("forbidden"),
        "viewer cannot remove members",
      );
    }

    console.log("--- modules ---");
    const modules = await listSettingModules(ownerCtx);
    expect(modules.length > 0, "modules listed");
    expect(
      modules.some((mod) => mod.key === "settings" && mod.isCore && mod.enabled),
      "settings module is core and enabled",
    );

    const disableCrm = await setSettingModuleEnabled(ownerCtx, "crm", false);
    expect(disableCrm.ok, "owner can disable a non-core module");
    crmTouched = true;
    const afterDisable = await listSettingModules(ownerCtx);
    expect(
      afterDisable.find((mod) => mod.key === "crm")?.enabled === false,
      "module disabled state persisted",
    );

    const enableCrm = await setSettingModuleEnabled(ownerCtx, "crm", true);
    expect(enableCrm.ok, "owner can re-enable a module");
    crmTouched = false;

    const disableCore = await setSettingModuleEnabled(ownerCtx, "settings", false);
    expect(
      !disableCore.ok && disableCore.errorKey?.includes("coreModule"),
      "core module cannot be disabled",
    );

    const unknownModule = await setSettingModuleEnabled(ownerCtx, "nope", true);
    expect(!unknownModule.ok && unknownModule.errorKey?.includes("notFound"), "unknown module rejected");

    if (viewerCtx) {
      const viewerModule = await setSettingModuleEnabled(viewerCtx, "crm", false);
      expect(
        !viewerModule.ok && viewerModule.errorKey?.includes("forbidden"),
        "viewer cannot manage modules",
      );
    }
  } finally {
    console.log("--- cleanup ---");
    await systemDb.organization.update({
      where: { id: orgId },
      data: { ...originalOrg },
    });
    console.log("PASS: organization settings restored");

    if (crmTouched) {
      const orgModules = await systemDb.organizationModule.findFirst({
        where: { organizationId: orgId, module: { key: "crm" } },
      });
      if (orgModules) {
        await systemDb.organizationModule.update({
          where: { id: orgModules.id },
          data: { enabled: true, enabledAt: new Date() },
        });
        console.log("PASS: crm module re-enabled");
      }
    }

    if (createdMemberId) {
      await systemDb.organizationMember.deleteMany({
        where: { id: createdMemberId },
      });
    }
    if (createdRoleId) {
      await systemDb.role.deleteMany({
        where: { id: createdRoleId, isSystem: false },
      });
    }
    if (createdUserId) {
      await systemDb.user.deleteMany({ where: { id: createdUserId } });
    }
    await systemDb.organizationMember.deleteMany({
      where: { organizationId: orgId, user: { email: testEmail } },
    });
    await systemDb.user.deleteMany({ where: { email: testEmail } });
    console.log("PASS: test members, users and roles removed");

    const leftoverRoles = await systemDb.role.findMany({
      where: { organizationId: orgId, isSystem: false },
      select: { key: true },
    });
    expect(
      leftoverRoles.length === 1 && leftoverRoles[0].key === "store-manager",
      "only the seeded template role remains",
    );
    const leftoverMember = await systemDb.organizationMember.findFirst({
      where: { organizationId: orgId, user: { email: testEmail } },
    });
    expect(leftoverMember === null, "no leftover test member");

    const restored = await systemDb.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        name: true,
        currency: true,
        timezone: true,
        dateFormat: true,
        primaryColor: true,
        logo: true,
        loginBackground: true,
      },
    });
    expect(restored.name === originalOrg.name, "company name restored");
    expect(restored.currency === originalOrg.currency, "currency restored");
    expect(restored.primaryColor === originalOrg.primaryColor, "primary color restored");
    expect(restored.loginBackground === originalOrg.loginBackground, "login background restored");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
