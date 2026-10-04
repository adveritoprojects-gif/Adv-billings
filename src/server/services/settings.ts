import { AuthError } from "@/server/auth/errors";
import type { OrganizationContext } from "@/server/auth/guards";
import {
  hasPermission,
  PERMISSIONS,
  PERMISSION_CATALOG,
  type PermissionKey,
} from "@/server/auth/permissions";
import { hashPassword } from "@/server/auth/password";
import { canAddUser } from "@/server/billing/limits";
import { db, orgScope, systemDb } from "@/server/db";
import { logActivity } from "@/server/services/activity";
import {
  DATE_FORMAT_OPTIONS,
} from "@/components/settings/constants";
import type {
  BrandingSettings,
  BusinessSettings,
  SettingsActionResult,
  SettingsMembersData,
  SettingsModuleRow,
  SettingsRolesData,
} from "@/components/settings/types";

export const SETTINGS_ERRORS = {
  forbidden: "settings.errors.forbidden",
  generic: "settings.errors.generic",
  notFound: "settings.errors.notFound",
  required: "settings.errors.required",
  invalidEmail: "settings.errors.invalidEmail",
  passwordShort: "settings.errors.passwordShort",
  invalidRole: "settings.errors.invalidRole",
  memberExists: "settings.errors.memberExists",
  lastOwner: "settings.errors.lastOwner",
  invalidColor: "settings.errors.invalidColor",
  invalidUrl: "settings.errors.invalidUrl",
  invalidDateFormat: "settings.errors.invalidDateFormat",
  invalidCurrency: "settings.errors.invalidCurrency",
  invalidTimezone: "settings.errors.invalidTimezone",
  roleKeyInvalid: "settings.errors.roleKeyInvalid",
  roleKeyTaken: "settings.errors.roleKeyTaken",
  roleInUse: "settings.errors.roleInUse",
  roleSystem: "settings.errors.roleSystem",
  coreModule: "settings.errors.coreModule",
} as const;

export interface BusinessInput {
  name?: string | null;
  businessType?: string | null;
  currency?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
}

export interface BrandingInput {
  logo?: string | null;
  favicon?: string | null;
  loginLogo?: string | null;
  loginBackground?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface AddMemberInput {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  roleKey?: string | null;
}

export interface RoleInput {
  name?: string | null;
  key?: string | null;
  permissionKeys?: readonly string[];
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ROLE_KEY_PATTERN = /^[a-z][a-z0-9-]{1,38}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const TIMEZONE_PATTERN = /^[A-Za-z0-9_+\-/]{1,64}$/;

function fail(errorKey: string): SettingsActionResult {
  return { ok: false, errorKey };
}

function str(value: string | null | undefined, max = 500): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function optionalStr(value: string | null | undefined, max = 500): string | null {
  const trimmed = str(value, max);
  return trimmed ? trimmed : null;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

function validImageRef(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  return /^https?:\/\/[^\s]+$/i.test(value);
}

function can(
  ctx: OrganizationContext,
  permission: PermissionKey,
): boolean {
  return hasPermission(ctx.role.key, ctx.permissions, permission);
}

function ensure(
  ctx: OrganizationContext,
  permission: PermissionKey,
): void {
  if (!can(ctx, permission)) {
    throw new AuthError("FORBIDDEN", `Missing permission: ${permission}`);
  }
}

async function audit(
  ctx: OrganizationContext,
  action: string,
  metadata?: Record<string, string | number | boolean | null>,
): Promise<void> {
  await logActivity(ctx.organization.id, {
    action,
    actorId: ctx.user.id,
    entity: "settings",
    metadata,
  }).catch(() => undefined);
}

export function getBusinessSettings(
  ctx: OrganizationContext,
): BusinessSettings {
  ensure(ctx, PERMISSIONS.SETTINGS_READ);
  const org = ctx.organization;
  return {
    name: org.name,
    slug: org.slug,
    businessType: org.businessType,
    currency: org.currency,
    timezone: org.timezone,
    dateFormat: org.dateFormat,
  };
}

export async function getBrandingSettings(
  ctx: OrganizationContext,
): Promise<BrandingSettings> {
  ensure(ctx, PERMISSIONS.SETTINGS_READ);
  const org = await orgScope(ctx, () =>
    systemDb.organization.findUnique({
      where: { id: ctx.organization.id },
      select: {
        logo: true,
        favicon: true,
        loginLogo: true,
        loginBackground: true,
        primaryColor: true,
        secondaryColor: true,
      },
    }),
  );
  if (!org) {
    throw new AuthError("FORBIDDEN");
  }
  return {
    logo: org.logo,
    favicon: org.favicon,
    loginLogo: org.loginLogo,
    loginBackground: org.loginBackground,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
  };
}

export async function listSettingMembers(
  ctx: OrganizationContext,
): Promise<SettingsMembersData> {
  ensure(ctx, PERMISSIONS.MEMBERS_READ);
  const [rows, systemRoles, customRoles] = await Promise.all([
    systemDb.organizationMember.findMany({
      where: { organizationId: ctx.organization.id, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { key: true, name: true } },
      },
    }),
    systemDb.role.findMany({
      where: { organizationId: null, isSystem: true },
      orderBy: { name: "asc" },
      select: { key: true, name: true, isSystem: true },
    }),
    systemDb.role.findMany({
      where: { organizationId: ctx.organization.id, isSystem: false },
      orderBy: { name: "asc" },
      select: { key: true, name: true, isSystem: true },
    }),
  ]);

  return {
    members: rows.map((row) => ({
      id: row.id,
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      roleKey: row.role.key,
      roleName: row.role.name,
      status: row.status,
      joinedAt: row.joinedAt,
    })),
    roleOptions: [...systemRoles, ...customRoles],
  };
}

export async function listSettingRoles(
  ctx: OrganizationContext,
): Promise<SettingsRolesData> {
  ensure(ctx, PERMISSIONS.ROLES_READ);
  const [systemRoles, customRoles, membershipCounts, allPermissions] =
    await Promise.all([
      systemDb.role.findMany({
        where: { organizationId: null, isSystem: true },
        orderBy: { name: "asc" },
        include: { rolePermissions: { select: { permissionId: true } } },
      }),
      systemDb.role.findMany({
        where: { organizationId: ctx.organization.id },
        orderBy: { name: "asc" },
        include: { rolePermissions: { select: { permissionId: true } } },
      }),
      systemDb.organizationMember.groupBy({
        by: ["roleId"],
        where: { organizationId: ctx.organization.id, status: "ACTIVE" },
        _count: { _all: true },
      }),
      systemDb.permission.findMany({ select: { id: true, key: true } }),
    ]);

  const keyById = new Map(allPermissions.map((p) => [p.id, p.key]));

  const counts = new Map(
    membershipCounts.map((row) => [row.roleId, row._count._all]),
  );

  const toRow = (role: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    rolePermissions: { permissionId: string }[];
  }) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    memberCount: counts.get(role.id) ?? 0,
    permissions: role.rolePermissions
      .map((rp) => keyById.get(rp.permissionId))
      .filter((key): key is string => Boolean(key))
      .sort(),
  });

  const groups = new Map<string, SettingsRolesData["permissionGroups"][number]>();
  for (const entry of PERMISSION_CATALOG) {
    const bucket = groups.get(entry.group) ?? {
      group: entry.group,
      permissions: [],
    };
    bucket.permissions.push({
      key: entry.key,
      name: entry.name,
      description: entry.description,
      group: entry.group,
    });
    groups.set(entry.group, bucket);
  }

  return {
    roles: [...systemRoles.map(toRow), ...customRoles.map(toRow)],
    permissionGroups: [...groups.values()],
  };
}

export async function listSettingModules(
  ctx: OrganizationContext,
): Promise<SettingsModuleRow[]> {
  ensure(ctx, PERMISSIONS.MODULES_READ);
  const [modules, enabledRows] = await Promise.all([
    systemDb.module.findMany({ orderBy: { sortOrder: "asc" } }),
    orgScope(ctx, () =>
      db.organizationModule.findMany({
        where: { organizationId: ctx.organization.id },
        select: { module: { select: { key: true } }, enabled: true },
      }),
    ),
  ]);
  const enabledByKey = new Map(
    enabledRows.map((row) => [row.module.key, row.enabled]),
  );
  return modules.map((mod) => ({
    key: mod.key,
    name: mod.name,
    description: mod.description,
    isCore: mod.isCore,
    sortOrder: mod.sortOrder,
    enabled: enabledByKey.get(mod.key) ?? mod.isCore,
  }));
}

export async function updateBusiness(
  ctx: OrganizationContext,
  input: BusinessInput,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.ORGANIZATION_UPDATE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const name = str(input.name, 120);
  if (!name) {
    return fail(SETTINGS_ERRORS.required);
  }
  const businessType = optionalStr(input.businessType, 80);
  const currencyRaw = str(input.currency, 8).toUpperCase();
  const currency = currencyRaw || null;
  if (currency && !CURRENCY_PATTERN.test(currency)) {
    return fail(SETTINGS_ERRORS.invalidCurrency);
  }
  const timezone = optionalStr(input.timezone, 64);
  if (timezone && !TIMEZONE_PATTERN.test(timezone)) {
    return fail(SETTINGS_ERRORS.invalidTimezone);
  }
  const dateFormat = optionalStr(input.dateFormat, 40);
  if (dateFormat && !(DATE_FORMAT_OPTIONS as readonly string[]).includes(dateFormat)) {
    return fail(SETTINGS_ERRORS.invalidDateFormat);
  }

  await systemDb.organization.update({
    where: { id: ctx.organization.id },
    data: { name, businessType, currency, timezone, dateFormat },
  });
  await audit(ctx, "settings.business.updated", { name });
  return { ok: true, id: ctx.organization.id };
}

export async function updateBranding(
  ctx: OrganizationContext,
  input: BrandingInput,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.ORGANIZATION_UPDATE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }

  const primaryRaw = str(input.primaryColor, 20);
  const secondaryRaw = str(input.secondaryColor, 20);
  if (primaryRaw && !validColor(primaryRaw)) {
    return fail(SETTINGS_ERRORS.invalidColor);
  }
  if (secondaryRaw && !validColor(secondaryRaw)) {
    return fail(SETTINGS_ERRORS.invalidColor);
  }

  const imageFields: [keyof BrandingInput, string | null][] = [
    ["logo", optionalStr(input.logo)],
    ["favicon", optionalStr(input.favicon)],
    ["loginLogo", optionalStr(input.loginLogo)],
    ["loginBackground", optionalStr(input.loginBackground)],
  ];
  for (const [, value] of imageFields) {
    if (value && !validImageRef(value)) {
      return fail(SETTINGS_ERRORS.invalidUrl);
    }
  }

  await systemDb.organization.update({
    where: { id: ctx.organization.id },
    data: {
      logo: optionalStr(input.logo),
      favicon: optionalStr(input.favicon),
      loginLogo: optionalStr(input.loginLogo),
      loginBackground: optionalStr(input.loginBackground),
      primaryColor: primaryRaw ? primaryRaw : null,
      secondaryColor: secondaryRaw ? secondaryRaw : null,
    },
  });
  await audit(ctx, "settings.branding.updated", {
    primary: primaryRaw || null,
  });
  return { ok: true, id: ctx.organization.id };
}

async function findOrgRole(
  organizationId: string,
  roleKey: string,
): Promise<{ id: string; key: string; name: string; isSystem: boolean; organizationId: string | null } | null> {
  return systemDb.role.findFirst({
    where: {
      key: roleKey,
      OR: [{ organizationId: null, isSystem: true }, { organizationId }],
    },
    select: {
      id: true,
      key: true,
      name: true,
      isSystem: true,
      organizationId: true,
    },
  });
}

export async function addSettingMember(
  ctx: OrganizationContext,
  input: AddMemberInput,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.MEMBERS_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const email = str(input.email, 200).toLowerCase();
  const name = str(input.name, 120);
  const password = str(input.password, 200);
  const roleKey = str(input.roleKey, 40);
  if (!email) {
    return fail(SETTINGS_ERRORS.required);
  }
  if (!validEmail(email)) {
    return fail(SETTINGS_ERRORS.invalidEmail);
  }
  const role = await findOrgRole(ctx.organization.id, roleKey);
  if (!role) {
    return fail(SETTINGS_ERRORS.invalidRole);
  }

  const userLimit = await canAddUser(ctx);
  if (!userLimit.ok) {
    return { ok: false, errorKey: userLimit.errorKey };
  }

  const user = await systemDb.user.findUnique({ where: { email } });
  if (user) {
    const existingMember = await systemDb.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organization.id,
          userId: user.id,
        },
      },
      select: { id: true },
    });
    if (existingMember) {
      return fail(SETTINGS_ERRORS.memberExists);
    }
  } else {
    if (!name) {
      return fail(SETTINGS_ERRORS.required);
    }
    if (password.length < 8) {
      return fail(SETTINGS_ERRORS.passwordShort);
    }
  }

  let member;
  if (user) {
    member = await systemDb.organizationMember.create({
      data: {
        organizationId: ctx.organization.id,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
      },
    });
  } else {
    const passwordHash = await hashPassword(password);
    member = await systemDb.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          status: "ACTIVE",
          emailVerified: new Date(),
        },
      });
      return tx.organizationMember.create({
        data: {
          organizationId: ctx.organization.id,
          userId: createdUser.id,
          roleId: role.id,
          status: "ACTIVE",
        },
      });
    });
  }
  await audit(ctx, "settings.member.added", { email, role: role.name });
  return { ok: true, id: member.id };
}

export async function changeSettingMemberRole(
  ctx: OrganizationContext,
  memberId: string,
  roleKey: string,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.MEMBERS_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const role = await findOrgRole(ctx.organization.id, str(roleKey, 40));
  if (!role) {
    return fail(SETTINGS_ERRORS.invalidRole);
  }
  const member = await systemDb.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.organization.id },
    include: {
      user: { select: { email: true } },
      role: { select: { key: true } },
    },
  });
  if (!member) {
    return fail(SETTINGS_ERRORS.notFound);
  }
  if (member.roleId === role.id) {
    return { ok: true, id: member.id };
  }
  if (member.role.key === "owner") {
    const owners = await systemDb.organizationMember.count({
      where: {
        organizationId: ctx.organization.id,
        status: "ACTIVE",
        role: { key: "owner" },
      },
    });
    if (owners <= 1) {
      return fail(SETTINGS_ERRORS.lastOwner);
    }
  }

  await systemDb.organizationMember.update({
    where: { id: member.id },
    data: { roleId: role.id },
  });
  await audit(ctx, "settings.member.roleChanged", {
    email: member.user.email,
    role: role.name,
  });
  return { ok: true, id: member.id };
}

export async function removeSettingMember(
  ctx: OrganizationContext,
  memberId: string,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.MEMBERS_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const member = await systemDb.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.organization.id },
    include: {
      user: { select: { email: true } },
      role: { select: { key: true } },
    },
  });
  if (!member) {
    return fail(SETTINGS_ERRORS.notFound);
  }
  if (member.role.key === "owner") {
    const owners = await systemDb.organizationMember.count({
      where: {
        organizationId: ctx.organization.id,
        status: "ACTIVE",
        role: { key: "owner" },
      },
    });
    if (owners <= 1) {
      return fail(SETTINGS_ERRORS.lastOwner);
    }
  }

  await systemDb.organizationMember.delete({ where: { id: member.id } });
  await audit(ctx, "settings.member.removed", { email: member.user.email });
  return { ok: true, id: member.id };
}

async function resolvePermissionIds(
  permissionKeys: readonly string[],
): Promise<string[] | null> {
  const validKeys = new Set<string>(
    PERMISSION_CATALOG.map((entry) => entry.key),
  );
  const raw = [
    ...new Set(permissionKeys.map((key) => str(key, 64))),
  ].filter((key) => key.length > 0);
  if (raw.some((key) => !validKeys.has(key))) {
    return null;
  }
  const rows = await systemDb.permission.findMany({
    where: { key: { in: raw } },
    select: { id: true },
  });
  if (rows.length !== raw.length) {
    return null;
  }
  return rows.map((row) => row.id);
}

export async function createSettingRole(
  ctx: OrganizationContext,
  input: RoleInput,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.ROLES_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const name = str(input.name, 80);
  const key = str(input.key, 40).toLowerCase();
  if (!name) {
    return fail(SETTINGS_ERRORS.required);
  }
  if (!ROLE_KEY_PATTERN.test(key)) {
    return fail(SETTINGS_ERRORS.roleKeyInvalid);
  }
  const systemKey = await systemDb.role.findFirst({
    where: { organizationId: null, key, isSystem: true },
    select: { id: true },
  });
  if (systemKey) {
    return fail(SETTINGS_ERRORS.roleKeyTaken);
  }
  const existing = await systemDb.role.findFirst({
    where: { organizationId: ctx.organization.id, key },
    select: { id: true },
  });
  if (existing) {
    return fail(SETTINGS_ERRORS.roleKeyTaken);
  }
  const permissionIds = await resolvePermissionIds(input.permissionKeys ?? []);
  if (!permissionIds) {
    return fail(SETTINGS_ERRORS.invalidRole);
  }

  const role = await systemDb.role.create({
    data: {
      organizationId: ctx.organization.id,
      key,
      name,
      isSystem: false,
      rolePermissions: {
        create: permissionIds.map((permissionId) => ({ permissionId })),
      },
    },
  });
  await audit(ctx, "settings.role.created", { role: name, key });
  return { ok: true, id: role.id };
}

export async function updateSettingRole(
  ctx: OrganizationContext,
  roleId: string,
  input: RoleInput,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.ROLES_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const role = await systemDb.role.findFirst({
    where: { id: roleId, organizationId: ctx.organization.id },
    select: { id: true, key: true },
  });
  if (!role) {
    return fail(SETTINGS_ERRORS.roleSystem);
  }
  const name = str(input.name, 80);
  if (!name) {
    return fail(SETTINGS_ERRORS.required);
  }
  const permissionIds = await resolvePermissionIds(input.permissionKeys ?? []);
  if (!permissionIds) {
    return fail(SETTINGS_ERRORS.invalidRole);
  }

  await systemDb.$transaction([
    systemDb.role.update({ where: { id: role.id }, data: { name } }),
    systemDb.rolePermission.deleteMany({ where: { roleId: role.id } }),
    systemDb.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    }),
  ]);
  await audit(ctx, "settings.role.updated", { role: name });
  return { ok: true, id: role.id };
}

export async function deleteSettingRole(
  ctx: OrganizationContext,
  roleId: string,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.ROLES_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const role = await systemDb.role.findFirst({
    where: { id: roleId, organizationId: ctx.organization.id },
    select: { id: true, name: true },
  });
  if (!role) {
    return fail(SETTINGS_ERRORS.roleSystem);
  }
  const memberCount = await systemDb.organizationMember.count({
    where: { organizationId: ctx.organization.id, roleId: role.id },
  });
  if (memberCount > 0) {
    return fail(SETTINGS_ERRORS.roleInUse);
  }

  await systemDb.role.delete({ where: { id: role.id } });
  await audit(ctx, "settings.role.deleted", { role: role.name });
  return { ok: true, id: role.id };
}

export async function setSettingModuleEnabled(
  ctx: OrganizationContext,
  moduleKey: string,
  enabled: boolean,
): Promise<SettingsActionResult> {
  if (!can(ctx, PERMISSIONS.MODULES_MANAGE)) {
    return fail(SETTINGS_ERRORS.forbidden);
  }
  const key = str(moduleKey, 40);
  const targetModule = await systemDb.module.findUnique({
    where: { key },
  });
  if (!targetModule) {
    return fail(SETTINGS_ERRORS.notFound);
  }
  if (targetModule.isCore && !enabled) {
    return fail(SETTINGS_ERRORS.coreModule);
  }

  await orgScope(ctx, () =>
    db.organizationModule.upsert({
      where: {
        organizationId_moduleId: {
          organizationId: ctx.organization.id,
          moduleId: targetModule.id,
        },
      },
      update: { enabled, enabledAt: enabled ? new Date() : null },
      create: {
        organizationId: ctx.organization.id,
        moduleId: targetModule.id,
        enabled,
        enabledAt: enabled ? new Date() : null,
      },
    }),
  );
  await audit(ctx, enabled ? "settings.module.enabled" : "settings.module.disabled", {
    module: targetModule.name,
  });
  return { ok: true, id: targetModule.key };
}
