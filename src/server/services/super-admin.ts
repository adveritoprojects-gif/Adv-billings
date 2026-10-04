import { PlanKey, Prisma } from "@prisma/client";

import type {
  OrganizationListRow,
  PlatformMetrics,
  SuperAdminActionResult,
} from "@/components/super-admin/types";
import {
  getIndustryTemplate,
  isIndustryTemplateKey,
} from "@/config/industry";
import { hashPassword } from "@/server/auth/password";
import { systemDb } from "@/server/db";
import {
  createUnusablePasswordHash,
  inviteOrganizationOwner,
} from "@/server/services/invitations";

export const SUPER_ADMIN_ERRORS = {
  unauthenticated: "superAdmin.errors.unauthenticated",
  forbidden: "superAdmin.errors.forbidden",
  notFound: "superAdmin.errors.notFound",
  generic: "superAdmin.errors.generic",
  required: "superAdmin.errors.required",
  invalidEmail: "superAdmin.errors.invalidEmail",
  slugInvalid: "superAdmin.errors.slugInvalid",
  slugTaken: "superAdmin.errors.slugTaken",
  passwordShort: "superAdmin.errors.passwordShort",
  invalidRole: "superAdmin.errors.invalidRole",
  memberExists: "superAdmin.errors.memberExists",
  lastOwner: "superAdmin.errors.lastOwner",
  coreModule: "superAdmin.errors.coreModule",
  samePlan: "superAdmin.errors.samePlan",
  subscriptionMissing: "superAdmin.errors.subscriptionMissing",
  invalidDays: "superAdmin.errors.invalidDays",
  notTrial: "superAdmin.errors.notTrial",
  alreadySuspended: "superAdmin.errors.alreadySuspended",
  notSuspended: "superAdmin.errors.notSuspended",
  suspendedSubscription: "superAdmin.errors.suspendedSubscription",
  invalidStatus: "superAdmin.errors.invalidStatus",
  invalidPlan: "superAdmin.errors.invalidPlan",
  invalidColor: "superAdmin.errors.invalidColor",
  invalidTemplate: "superAdmin.errors.invalidTemplate",
  invalidModule: "superAdmin.errors.invalidModule",
  emailTaken: "superAdmin.errors.emailTaken",
  inviteFailed: "superAdmin.errors.inviteFailed",
  inviteAlreadyAccepted: "superAdmin.errors.inviteAlreadyAccepted",
  inviteNotFound: "superAdmin.errors.inviteNotFound",
  inviteRateLimited: "superAdmin.errors.inviteRateLimited",
} as const;

export const MEMBER_ROLE_KEYS = [
  "owner",
  "admin",
  "manager",
  "staff",
  "viewer",
] as const;

export interface SuperAdminActor {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

interface AuditInput {
  organizationId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

function fail(errorKey: string): SuperAdminActionResult {
  return { ok: false, errorKey };
}

function str(value: unknown, max = 200): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function validSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

function parseDays(value: unknown, fallback: number): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const days = Math.floor(Number(value));
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    return null;
  }
  return days;
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function nextPeriod(from: Date, interval: string): Date {
  const end = new Date(from);
  if (interval === "YEAR") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end;
}

async function logPlatformAudit(
  actor: SuperAdminActor,
  input: AuditInput,
): Promise<void> {
  await systemDb.platformAuditLog.create({
    data: {
      actorId: actor.userId,
      organizationId: input.organizationId ?? null,
      action: input.action,
      summary: input.summary,
      metadata: input.metadata ?? undefined,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    },
  });
}

async function loadClientOrganization(organizationId: string) {
  const organization = await systemDb.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization || organization.isPlatform) {
    return null;
  }
  return organization;
}

function isKnownRequestError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const clientFilter = { isPlatform: false };
  const [
    totalOrganizations,
    activeOrganizations,
    trialOrganizations,
    suspendedOrganizations,
    totalUsers,
    activeSubscriptions,
    activeSubRows,
  ] = await Promise.all([
    systemDb.organization.count({ where: clientFilter }),
    systemDb.organization.count({
      where: { ...clientFilter, status: "ACTIVE" },
    }),
    systemDb.organization.count({
      where: { ...clientFilter, subscription: { state: "TRIAL" } },
    }),
    systemDb.organization.count({
      where: {
        ...clientFilter,
        OR: [{ status: "SUSPENDED" }, { subscription: { state: "SUSPENDED" } }],
      },
    }),
    systemDb.user.count(),
    systemDb.subscription.count({
      where: {
        state: { in: ["ACTIVE", "TRIAL"] },
        organization: { isPlatform: false },
      },
    }),
    systemDb.subscription.findMany({
      where: { state: "ACTIVE", organization: { isPlatform: false } },
      include: {
        plan: { select: { priceCents: true, currency: true, interval: true } },
      },
    }),
  ]);

  let mrrCents = 0;
  let mrrCurrency = "USD";
  for (const row of activeSubRows) {
    const monthly =
      row.plan.interval === "YEAR"
        ? Math.round(row.plan.priceCents / 12)
        : row.plan.priceCents;
    mrrCents += monthly;
    mrrCurrency = row.plan.currency;
  }

  return {
    totalOrganizations,
    activeOrganizations,
    trialOrganizations,
    suspendedOrganizations,
    totalUsers,
    activeSubscriptions,
    mrrCents,
    mrrCurrency,
  };
}

export async function listOrganizations(): Promise<OrganizationListRow[]> {
  const rows = await systemDb.organization.findMany({
    where: { isPlatform: false },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      subscription: { include: { plan: { select: { name: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    businessType: row.businessType,
    createdAt: row.createdAt,
    memberCount: row._count.members,
    planName: row.subscription?.plan.name ?? null,
    subscriptionState: row.subscription ? row.subscription.state : null,
  }));
}

export interface OrganizationDetailSubscription {
  id: string;
  state: string;
  planId: string;
  planKey: string;
  planName: string;
  priceCents: number;
  currency: string;
  interval: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  endedAt: Date | null;
}

export interface OrganizationDetailModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isCore: boolean;
  enabled: boolean;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  businessType: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  templateKey: string;
  timezone: string | null;
  currency: string | null;
  dateFormat: string | null;
  status: string;
  createdAt: Date;
  memberCount: number;
  members: OrganizationListMember[];
  subscription: OrganizationDetailSubscription | null;
  modules: OrganizationDetailModule[];
}

export interface OrganizationListMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleKey: string;
  status: string;
  joinedAt: Date;
}

export async function getOrganizationDetail(
  organizationId: string,
): Promise<OrganizationDetail | null> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return null;
  }

  const [memberRows, subscription, orgModules, allModules] =
    await Promise.all([
      systemDb.organizationMember.findMany({
        where: { organizationId: organization.id },
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: { name: true, email: true, avatarUrl: true },
          },
          role: { select: { key: true } },
        },
      }),
      systemDb.subscription.findUnique({
        where: { organizationId: organization.id },
        include: { plan: true },
      }),
      systemDb.organizationModule.findMany({
        where: { organizationId: organization.id },
      }),
      systemDb.module.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

  const enabledByModuleId = new Map(
    orgModules.map((row) => [row.moduleId, row]),
  );
  const modules: OrganizationDetailModule[] = allModules.map((module) => {
    const row = enabledByModuleId.get(module.id);
    return {
      id: module.id,
      key: module.key,
      name: module.name,
      description: module.description,
      isCore: module.isCore,
      enabled: module.isCore ? true : (row?.enabled ?? false),
    };
  });

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo,
    favicon: organization.favicon,
    primaryColor: organization.primaryColor,
    secondaryColor: organization.secondaryColor,
    businessType: organization.businessType,
    email: organization.email,
    phone: organization.phone,
    website: organization.website,
    address: organization.address,
    templateKey: organization.templateKey,
    timezone: organization.timezone,
    currency: organization.currency,
    dateFormat: organization.dateFormat,
    status: organization.status,
    createdAt: organization.createdAt,
    memberCount: memberRows.length,
    members: memberRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      avatarUrl: row.user.avatarUrl,
      roleKey: row.role.key,
      status: row.status,
      joinedAt: row.joinedAt,
    })),
    subscription: subscription
      ? {
          id: subscription.id,
          state: subscription.state,
          planId: subscription.planId,
          planKey: String(subscription.plan.key),
          planName: subscription.plan.name,
          priceCents: subscription.plan.priceCents,
          currency: subscription.plan.currency,
          interval: String(subscription.plan.interval),
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt: subscription.trialEndsAt,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          endedAt: subscription.endedAt,
        }
      : null,
    modules,
  };
}

export interface CreateOrganizationInput {
  name: unknown;
  slug: unknown;
  businessType: unknown;
  templateKey?: unknown;
  ownerName: unknown;
  ownerEmail: unknown;
}

export async function createOrganization(
  actor: SuperAdminActor,
  input: CreateOrganizationInput,
): Promise<SuperAdminActionResult> {
  const name = str(input.name, 120);
  const slug = str(input.slug, 60).toLowerCase();
  const businessType = str(input.businessType, 80);
  const templateKey = str(input.templateKey, 40);
  const ownerName = str(input.ownerName, 120);
  const ownerEmail = str(input.ownerEmail, 200).toLowerCase();

  if (!name || !slug) {
    return fail(SUPER_ADMIN_ERRORS.required);
  }
  if (!validSlug(slug)) {
    return fail(SUPER_ADMIN_ERRORS.slugInvalid);
  }
  if (templateKey && !isIndustryTemplateKey(templateKey)) {
    return fail(SUPER_ADMIN_ERRORS.invalidTemplate);
  }
  if (!ownerName) {
    return fail(SUPER_ADMIN_ERRORS.required);
  }
  if (!validEmail(ownerEmail)) {
    return fail(SUPER_ADMIN_ERRORS.invalidEmail);
  }

  const existingSlug = await systemDb.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existingSlug) {
    return fail(SUPER_ADMIN_ERRORS.slugTaken);
  }

  const ownerRole = await systemDb.role.findFirst({
    where: { organizationId: null, key: "owner", isSystem: true },
  });
  if (!ownerRole) {
    return fail(SUPER_ADMIN_ERRORS.generic);
  }

  let owner = await systemDb.user.findUnique({
    where: { email: ownerEmail },
  });
  let createdUser = false;
  if (!owner) {
    owner = await systemDb.user.create({
      data: {
        email: ownerEmail,
        name: ownerName,
        passwordHash: await createUnusablePasswordHash(),
        status: "INVITED",
      },
    });
    createdUser = true;
  }

  const template = getIndustryTemplate(templateKey || undefined);

  let organization;
  try {
    organization = await systemDb.organization.create({
      data: {
        name,
        slug,
        businessType: businessType || null,
        templateKey: template.key,
      },
    });
  } catch (error) {
    if (createdUser) {
      await systemDb.user
        .delete({ where: { id: owner.id } })
        .catch(() => undefined);
    }
    if (isKnownRequestError(error, "P2002")) {
      return fail(SUPER_ADMIN_ERRORS.slugTaken);
    }
    throw error;
  }

  try {
    await systemDb.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: owner.id,
        roleId: ownerRole.id,
        status: "INVITED",
      },
    });
    const templateModuleKeys = new Set(template.modules);
    const modules = await systemDb.module.findMany({
      select: { id: true, key: true, isCore: true },
    });
    if (modules.length > 0) {
      await systemDb.organizationModule.createMany({
        data: modules.map((module) => {
          const enabled =
            module.isCore || templateModuleKeys.has(module.key);
          return {
            organizationId: organization.id,
            moduleId: module.id,
            enabled,
            enabledAt: enabled ? new Date() : null,
          };
        }),
        skipDuplicates: true,
      });
    }
    for (const customRole of template.customRoles ?? []) {
      const createdRole = await systemDb.role.create({
        data: {
          organizationId: organization.id,
          key: customRole.key,
          name: customRole.name,
          description: customRole.description ?? null,
          isSystem: false,
        },
      });
      const permissionRows = await systemDb.permission.findMany({
        where: { key: { in: customRole.permissions } },
        select: { id: true },
      });
      if (permissionRows.length > 0) {
        await systemDb.rolePermission.createMany({
          data: permissionRows.map((permission) => ({
            roleId: createdRole.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }
    }
    await logPlatformAudit(actor, {
      organizationId: organization.id,
      action: "organization.created",
      summary: `Super Admin created ${name}.`,
      metadata: {
        org: name,
        slug,
        owner: ownerEmail,
        template: template.key,
      },
    });
  } catch (error) {
    await systemDb.organization
      .delete({ where: { id: organization.id } })
      .catch(() => undefined);
    if (createdUser) {
      await systemDb.user
        .delete({ where: { id: owner.id } })
        .catch(() => undefined);
    }
    throw error;
  }

  const invitation = await inviteOrganizationOwner({
    userId: owner.id,
    organizationId: organization.id,
    invitedById: actor.userId,
  });

  return {
    ok: true,
    id: organization.id,
    invitationSent: invitation.sent,
  };
}

export interface OnboardingPlanOption {
  key: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays: number;
  enabledModules: string[];
}

export interface OnboardingModuleOption {
  key: string;
  name: string;
  description: string | null;
  isCore: boolean;
  sortOrder: number;
}

function jsonEnabledModules(limits: unknown): string[] {
  if (limits && typeof limits === "object" && !Array.isArray(limits)) {
    const value = (limits as { enabledModules?: unknown }).enabledModules;
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }
  }
  return [];
}

export async function listOnboardingOptions(): Promise<{
  plans: OnboardingPlanOption[];
  modules: OnboardingModuleOption[];
}> {
  const [plans, modules] = await Promise.all([
    systemDb.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    systemDb.module.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    plans: plans.map((plan) => ({
      key: String(plan.key),
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: String(plan.interval),
      trialDays: plan.trialDays,
      enabledModules: jsonEnabledModules(plan.limits),
    })),
    modules: modules.map((module) => ({
      key: module.key,
      name: module.name,
      description: module.description,
      isCore: module.isCore,
      sortOrder: module.sortOrder,
    })),
  };
}

export interface OnboardOrganizationInput {
  name: unknown;
  slug: unknown;
  businessType: unknown;
  email: unknown;
  phone: unknown;
  website: unknown;
  address: unknown;
  templateKey: unknown;
  logo: unknown;
  primaryColor: unknown;
  secondaryColor: unknown;
  favicon: unknown;
  modules: unknown;
  ownerName: unknown;
  ownerEmail: unknown;
  planKey: unknown;
}

export interface OnboardOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  templateKey: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  status: string;
  createdAt: Date;
  owner: { id: string; name: string; email: string };
  invitationSent?: boolean;
  plan: {
    key: string;
    name: string;
    state: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  };
  modules: string[];
  roles: string[];
}

export interface OnboardOrganizationResult extends SuperAdminActionResult {
  organization?: OnboardOrganizationSummary;
}

export async function onboardOrganization(
  actor: SuperAdminActor,
  input: OnboardOrganizationInput,
): Promise<OnboardOrganizationResult> {
  const name = str(input.name, 120);
  const slug = str(input.slug, 60).toLowerCase();
  const businessType = str(input.businessType, 80);
  const email = str(input.email, 200).toLowerCase();
  const phone = str(input.phone, 40);
  const website = str(input.website, 200);
  const address = str(input.address, 240);
  const templateKey = str(input.templateKey, 40);
  const logo = str(input.logo, 500);
  const primaryColor = str(input.primaryColor, 20);
  const secondaryColor = str(input.secondaryColor, 20);
  const favicon = str(input.favicon, 500);
  const ownerName = str(input.ownerName, 120);
  const ownerEmail = str(input.ownerEmail, 200).toLowerCase();
  const planKeyValue = str(input.planKey, 40).toUpperCase();

  if (!name || !slug) {
    return fail(SUPER_ADMIN_ERRORS.required);
  }
  if (!validSlug(slug)) {
    return fail(SUPER_ADMIN_ERRORS.slugInvalid);
  }
  if (templateKey && !isIndustryTemplateKey(templateKey)) {
    return fail(SUPER_ADMIN_ERRORS.invalidTemplate);
  }
  if (email && !validEmail(email)) {
    return fail(SUPER_ADMIN_ERRORS.invalidEmail);
  }
  if (primaryColor && !validColor(primaryColor)) {
    return fail(SUPER_ADMIN_ERRORS.invalidColor);
  }
  if (secondaryColor && !validColor(secondaryColor)) {
    return fail(SUPER_ADMIN_ERRORS.invalidColor);
  }
  if (!ownerName) {
    return fail(SUPER_ADMIN_ERRORS.required);
  }
  if (!validEmail(ownerEmail)) {
    return fail(SUPER_ADMIN_ERRORS.invalidEmail);
  }
  if (!Object.values(PlanKey).includes(planKeyValue as PlanKey)) {
    return fail(SUPER_ADMIN_ERRORS.invalidPlan);
  }

  const template = getIndustryTemplate(templateKey || undefined);

  const moduleKeys: string[] = [];
  if (Array.isArray(input.modules)) {
    for (const entry of input.modules) {
      const key = str(entry, 60);
      if (!key || moduleKeys.includes(key)) {
        continue;
      }
      moduleKeys.push(key);
    }
  }
  const templateModuleKeys = new Set(template.modules);
  for (const key of moduleKeys) {
    if (!templateModuleKeys.has(key)) {
      return fail(SUPER_ADMIN_ERRORS.invalidModule);
    }
  }

  const existingSlug = await systemDb.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existingSlug) {
    return fail(SUPER_ADMIN_ERRORS.slugTaken);
  }

  const plan = await systemDb.plan.findUnique({
    where: { key: planKeyValue as PlanKey },
  });
  if (!plan || !plan.isActive) {
    return fail(SUPER_ADMIN_ERRORS.invalidPlan);
  }

  const ownerRole = await systemDb.role.findFirst({
    where: { organizationId: null, key: "owner", isSystem: true },
  });
  if (!ownerRole) {
    return fail(SUPER_ADMIN_ERRORS.generic);
  }

  const existingOwner = await systemDb.user.findUnique({
    where: { email: ownerEmail },
  });

  const catalog = await systemDb.module.findMany({
    select: { id: true, key: true, isCore: true },
  });

  let summary: OnboardOrganizationSummary;
  try {
    summary = await systemDb.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            slug,
            businessType: businessType || null,
            email: email || null,
            phone: phone || null,
            website: website || null,
            address: address || null,
            templateKey: template.key,
            logo: logo || null,
            favicon: favicon || null,
            primaryColor: primaryColor || undefined,
            secondaryColor: secondaryColor || null,
          },
        });

        let owner = existingOwner;
        if (!owner) {
          owner = await tx.user.create({
            data: {
              email: ownerEmail,
              name: ownerName,
              passwordHash: await createUnusablePasswordHash(),
              status: "INVITED",
            },
          });
        }

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: owner.id,
            roleId: ownerRole.id,
            status: "INVITED",
          },
        });

        const desired = new Set(moduleKeys);
        if (catalog.length > 0) {
          await tx.organizationModule.createMany({
            data: catalog.map((module) => {
              const enabled = module.isCore || desired.has(module.key);
              return {
                organizationId: organization.id,
                moduleId: module.id,
                enabled,
                enabledAt: enabled ? new Date() : null,
              };
            }),
            skipDuplicates: true,
          });
        }

        const roleKeys: string[] = [];
        for (const customRole of template.customRoles ?? []) {
          const createdRole = await tx.role.create({
            data: {
              organizationId: organization.id,
              key: customRole.key,
              name: customRole.name,
              description: customRole.description ?? null,
              isSystem: false,
            },
          });
          roleKeys.push(createdRole.key);
          const permissionRows = await tx.permission.findMany({
            where: { key: { in: customRole.permissions } },
            select: { id: true },
          });
          if (permissionRows.length > 0) {
            await tx.rolePermission.createMany({
              data: permissionRows.map((permission) => ({
                roleId: createdRole.id,
                permissionId: permission.id,
              })),
              skipDuplicates: true,
            });
          }
        }

        const now = new Date();
        const nextState = plan.trialDays > 0 ? "TRIAL" : "ACTIVE";
        const trialEndsAt =
          nextState === "TRIAL" ? addDays(now, plan.trialDays) : null;
        const subscription = await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: plan.id,
            state: nextState,
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriod(now, String(plan.interval)),
            trialEndsAt,
            cancelAtPeriodEnd: false,
            endedAt: null,
          },
        });
        await tx.subscriptionEvent.create({
          data: {
            organizationId: organization.id,
            subscriptionId: subscription.id,
            type: "CREATED",
            toState: nextState,
            planKey: plan.key,
            actorId: actor.userId,
            metadata: { actor: "super_admin", source: "onboarding" },
          },
        });

        return {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          businessType: organization.businessType,
          email: organization.email,
          phone: organization.phone,
          website: organization.website,
          address: organization.address,
          templateKey: organization.templateKey,
          logo: organization.logo,
          favicon: organization.favicon,
          primaryColor: organization.primaryColor,
          secondaryColor: organization.secondaryColor,
          status: String(organization.status),
          createdAt: organization.createdAt,
          owner: { id: owner.id, name: owner.name, email: owner.email },
          plan: {
            key: String(plan.key),
            name: plan.name,
            state: nextState,
            trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
          modules: moduleKeys,
          roles: roleKeys,
        };
      },
      { timeout: 20000 },
    );
  } catch (error) {
    if (isKnownRequestError(error, "P2002")) {
      const target = JSON.stringify(error.meta?.target ?? "");
      if (target.includes("email")) {
        return fail(SUPER_ADMIN_ERRORS.emailTaken);
      }
      return fail(SUPER_ADMIN_ERRORS.slugTaken);
    }
    throw error;
  }

  try {
    await logPlatformAudit(actor, {
      organizationId: summary.id,
      action: "organization.created",
      summary: `Super Admin onboarded ${summary.name}.`,
      metadata: {
        org: summary.name,
        slug: summary.slug,
        owner: summary.owner.email,
        template: summary.templateKey,
        plan: summary.plan.key,
        source: "onboarding",
      },
    });
  } catch (error) {
    console.error("Failed to record onboarding audit:", error);
  }

  const invitation = await inviteOrganizationOwner({
    userId: summary.owner.id,
    organizationId: summary.id,
    invitedById: actor.userId,
  });
  summary.invitationSent = invitation.sent;

  return { ok: true, id: summary.id, organization: summary };
}

export interface UpdateOrganizationInput {
  name: unknown;
  slug: unknown;
  businessType: unknown;
  timezone: unknown;
  currency: unknown;
  dateFormat: unknown;
}

export async function updateOrganization(
  actor: SuperAdminActor,
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }

  const name = str(input.name, 120);
  const slug = str(input.slug, 60).toLowerCase();
  if (!name || !slug) {
    return fail(SUPER_ADMIN_ERRORS.required);
  }
  if (!validSlug(slug)) {
    return fail(SUPER_ADMIN_ERRORS.slugInvalid);
  }
  const clash = await systemDb.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash && clash.id !== organization.id) {
    return fail(SUPER_ADMIN_ERRORS.slugTaken);
  }

  await systemDb.organization.update({
    where: { id: organization.id },
    data: {
      name,
      slug,
      businessType: str(input.businessType, 80) || null,
      timezone: str(input.timezone, 80) || "UTC",
      currency: str(input.currency, 8).toUpperCase() || "USD",
      dateFormat: str(input.dateFormat, 40) || "yyyy-MM-dd",
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "organization.updated",
    summary: `Super Admin updated ${name}'s details.`,
    metadata: { org: name },
  });
  return { ok: true, id: organization.id };
}

export interface UpdateBrandingInput {
  primaryColor: unknown;
  secondaryColor: unknown;
  logo: unknown;
  favicon: unknown;
}

export async function updateBranding(
  actor: SuperAdminActor,
  organizationId: string,
  input: UpdateBrandingInput,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }

  const primaryColor = str(input.primaryColor, 20);
  const secondaryColor = str(input.secondaryColor, 20);
  if ((primaryColor && !validColor(primaryColor)) ||
      (secondaryColor && !validColor(secondaryColor))) {
    return fail(SUPER_ADMIN_ERRORS.invalidColor);
  }

  await systemDb.organization.update({
    where: { id: organization.id },
    data: {
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      logo: str(input.logo, 500) || null,
      favicon: str(input.favicon, 500) || null,
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "organization.brandingUpdated",
    summary: `Super Admin updated ${organization.name}'s branding.`,
    metadata: { org: organization.name },
  });
  return { ok: true, id: organization.id };
}

export async function setOrganizationStatus(
  actor: SuperAdminActor,
  organizationId: string,
  status: string,
): Promise<SuperAdminActionResult> {
  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return fail(SUPER_ADMIN_ERRORS.invalidStatus);
  }
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  if (organization.status === status) {
    return { ok: true, id: organization.id };
  }

  await systemDb.organization.update({
    where: { id: organization.id },
    data: { status },
  });
  const suspended = status === "SUSPENDED";
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: suspended ? "organization.suspended" : "organization.activated",
    summary: suspended
      ? `Super Admin suspended ${organization.name}.`
      : `Super Admin activated ${organization.name}.`,
    metadata: { org: organization.name },
  });
  return { ok: true, id: organization.id };
}

export async function setModuleEnabled(
  actor: SuperAdminActor,
  organizationId: string,
  moduleKey: string,
  enabled: boolean,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const targetModule = await systemDb.module.findUnique({
    where: { key: moduleKey },
  });
  if (!targetModule) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  if (targetModule.isCore && !enabled) {
    return fail(SUPER_ADMIN_ERRORS.coreModule);
  }

  await systemDb.organizationModule.upsert({
    where: {
      organizationId_moduleId: {
        organizationId: organization.id,
        moduleId: targetModule.id,
      },
    },
    update: { enabled, enabledAt: enabled ? new Date() : null },
    create: {
      organizationId: organization.id,
      moduleId: targetModule.id,
      enabled,
      enabledAt: enabled ? new Date() : null,
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: enabled ? "module.enabled" : "module.disabled",
    summary: enabled
      ? `Super Admin enabled the ${targetModule.name} module for ${organization.name}.`
      : `Super Admin disabled the ${targetModule.name} module for ${organization.name}.`,
    metadata: { org: organization.name, module: targetModule.name },
  });
  return { ok: true, id: organization.id };
}

export async function assignPlan(
  actor: SuperAdminActor,
  organizationId: string,
  planKey: string,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  if (!Object.values(PlanKey).includes(planKey as PlanKey)) {
    return fail(SUPER_ADMIN_ERRORS.invalidPlan);
  }
  const plan = await systemDb.plan.findUnique({
    where: { key: planKey as PlanKey },
  });
  if (!plan || !plan.isActive) {
    return fail(SUPER_ADMIN_ERRORS.invalidPlan);
  }

  const subscription = await systemDb.subscription.findUnique({
    where: { organizationId: organization.id },
    include: { plan: true },
  });
  if (subscription && subscription.plan.key === plan.key) {
    return fail(SUPER_ADMIN_ERRORS.samePlan);
  }

  const now = new Date();
  const nextState =
    subscription?.state === "SUSPENDED"
      ? "SUSPENDED"
      : plan.trialDays > 0
        ? "TRIAL"
        : "ACTIVE";
  const trialEndsAt =
    nextState === "TRIAL" ? addDays(now, plan.trialDays) : null;

  if (!subscription) {
    const created = await systemDb.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        state: nextState,
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriod(now, plan.interval),
        trialEndsAt,
        cancelAtPeriodEnd: false,
        endedAt: null,
      },
    });
    await systemDb.subscriptionEvent.create({
      data: {
        organizationId: organization.id,
        subscriptionId: created.id,
        type: "CREATED",
        toState: nextState,
        planKey: plan.key,
        actorId: actor.userId,
        metadata: { actor: "super_admin" },
      },
    });
    await logPlatformAudit(actor, {
      organizationId: organization.id,
      action: "subscription.planAssigned",
      summary: `Super Admin assigned the ${plan.name} plan to ${organization.name}.`,
      metadata: { org: organization.name, plan: plan.name },
    });
    return { ok: true, id: organization.id };
  }

  const previousPlan = subscription.plan;
  await systemDb.subscription.update({
    where: { id: subscription.id },
    data: {
      planId: plan.id,
      state: nextState,
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriod(now, plan.interval),
      trialEndsAt,
      cancelAtPeriodEnd: false,
      endedAt: null,
    },
  });
  await systemDb.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subscription.id,
      type: "PLAN_CHANGED",
      fromState: subscription.state,
      toState: nextState,
      planKey: plan.key,
      actorId: actor.userId,
      metadata: { previousPlanKey: previousPlan.key, actor: "super_admin" },
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "subscription.planChanged",
    summary: `Super Admin changed ${organization.name}'s plan from ${previousPlan.name} to ${plan.name}.`,
    metadata: {
      org: organization.name,
      from: previousPlan.name,
      to: plan.name,
    },
  });
  return { ok: true, id: organization.id };
}

export async function startTrial(
  actor: SuperAdminActor,
  organizationId: string,
  days?: unknown,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const subscription = await systemDb.subscription.findUnique({
    where: { organizationId: organization.id },
    include: { plan: true },
  });
  if (!subscription) {
    return fail(SUPER_ADMIN_ERRORS.subscriptionMissing);
  }
  if (subscription.state === "SUSPENDED") {
    return fail(SUPER_ADMIN_ERRORS.suspendedSubscription);
  }
  const trialDays =
    subscription.plan.trialDays > 0 ? subscription.plan.trialDays : 14;
  const resolvedDays = parseDays(days, trialDays);
  if (resolvedDays === null) {
    return fail(SUPER_ADMIN_ERRORS.invalidDays);
  }

  const now = new Date();
  const trialEndsAt = addDays(now, resolvedDays);
  await systemDb.subscription.update({
    where: { id: subscription.id },
    data: {
      state: "TRIAL",
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      cancelAtPeriodEnd: false,
      endedAt: null,
    },
  });
  if (subscription.state !== "TRIAL") {
    await systemDb.subscriptionEvent.create({
      data: {
        organizationId: organization.id,
        subscriptionId: subscription.id,
        type: "STATE_CHANGED",
        fromState: subscription.state,
        toState: "TRIAL",
        planKey: subscription.plan.key,
        actorId: actor.userId,
        metadata: { reason: "startTrial", days: resolvedDays },
      },
    });
  }
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "subscription.trialStarted",
    summary: `Super Admin started a ${resolvedDays}-day trial for ${organization.name} on the ${subscription.plan.name} plan.`,
    metadata: {
      org: organization.name,
      days: resolvedDays,
      plan: subscription.plan.name,
    },
  });
  return { ok: true, id: organization.id };
}

export async function extendTrial(
  actor: SuperAdminActor,
  organizationId: string,
  days?: unknown,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const subscription = await systemDb.subscription.findUnique({
    where: { organizationId: organization.id },
    include: { plan: true },
  });
  if (!subscription) {
    return fail(SUPER_ADMIN_ERRORS.subscriptionMissing);
  }
  if (subscription.state !== "TRIAL" && subscription.state !== "EXPIRED") {
    return fail(SUPER_ADMIN_ERRORS.notTrial);
  }
  const resolvedDays = parseDays(days, 14);
  if (resolvedDays === null) {
    return fail(SUPER_ADMIN_ERRORS.invalidDays);
  }

  const now = new Date();
  const base =
    subscription.trialEndsAt && subscription.trialEndsAt > now
      ? subscription.trialEndsAt
      : now;
  const trialEndsAt = addDays(base, resolvedDays);
  await systemDb.subscription.update({
    where: { id: subscription.id },
    data: {
      state: "TRIAL",
      trialEndsAt,
      currentPeriodEnd: trialEndsAt,
      cancelAtPeriodEnd: false,
      endedAt: null,
    },
  });
  if (subscription.state !== "TRIAL") {
    await systemDb.subscriptionEvent.create({
      data: {
        organizationId: organization.id,
        subscriptionId: subscription.id,
        type: "STATE_CHANGED",
        fromState: subscription.state,
        toState: "TRIAL",
        planKey: subscription.plan.key,
        actorId: actor.userId,
        metadata: { reason: "extendTrial", days: resolvedDays },
      },
    });
  }
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "subscription.trialExtended",
    summary: `Super Admin extended ${organization.name}'s trial by ${resolvedDays} days.`,
    metadata: { org: organization.name, days: resolvedDays },
  });
  return { ok: true, id: organization.id };
}

export async function suspendSubscription(
  actor: SuperAdminActor,
  organizationId: string,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const subscription = await systemDb.subscription.findUnique({
    where: { organizationId: organization.id },
    include: { plan: true },
  });
  if (!subscription) {
    return fail(SUPER_ADMIN_ERRORS.subscriptionMissing);
  }
  if (subscription.state === "SUSPENDED") {
    return fail(SUPER_ADMIN_ERRORS.alreadySuspended);
  }

  const now = new Date();
  await systemDb.subscription.update({
    where: { id: subscription.id },
    data: { state: "SUSPENDED", endedAt: now },
  });
  await systemDb.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subscription.id,
      type: "STATE_CHANGED",
      fromState: subscription.state,
      toState: "SUSPENDED",
      planKey: subscription.plan.key,
      actorId: actor.userId,
      metadata: { reason: "suspend" },
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "subscription.suspended",
    summary: `Super Admin suspended ${organization.name}'s subscription.`,
    metadata: { org: organization.name },
  });
  return { ok: true, id: organization.id };
}

export async function reactivateSubscription(
  actor: SuperAdminActor,
  organizationId: string,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const subscription = await systemDb.subscription.findUnique({
    where: { organizationId: organization.id },
    include: { plan: true },
  });
  if (!subscription) {
    return fail(SUPER_ADMIN_ERRORS.subscriptionMissing);
  }
  if (subscription.state === "ACTIVE" || subscription.state === "TRIAL") {
    return fail(SUPER_ADMIN_ERRORS.notSuspended);
  }

  const now = new Date();
  await systemDb.subscription.update({
    where: { id: subscription.id },
    data: {
      state: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriod(now, subscription.plan.interval),
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      endedAt: null,
    },
  });
  await systemDb.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subscription.id,
      type: "STATE_CHANGED",
      fromState: subscription.state,
      toState: "ACTIVE",
      planKey: subscription.plan.key,
      actorId: actor.userId,
      metadata: { reason: "reactivate" },
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "subscription.reactivated",
    summary: `Super Admin reactivated ${organization.name}'s subscription.`,
    metadata: { org: organization.name },
  });
  return { ok: true, id: organization.id };
}

export interface AddMemberInput {
  email: unknown;
  name: unknown;
  password: unknown;
  roleKey: unknown;
}

export async function addMember(
  actor: SuperAdminActor,
  organizationId: string,
  input: AddMemberInput,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const email = str(input.email, 200).toLowerCase();
  const name = str(input.name, 120);
  const password = str(input.password, 200);
  const roleKey = str(input.roleKey, 40);
  if (!email) {
    return fail(SUPER_ADMIN_ERRORS.required);
  }
  if (!validEmail(email)) {
    return fail(SUPER_ADMIN_ERRORS.invalidEmail);
  }
  if (!(MEMBER_ROLE_KEYS as readonly string[]).includes(roleKey)) {
    return fail(SUPER_ADMIN_ERRORS.invalidRole);
  }

  let user = await systemDb.user.findUnique({ where: { email } });
  if (user) {
    const existingMember = await systemDb.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      select: { id: true },
    });
    if (existingMember) {
      return fail(SUPER_ADMIN_ERRORS.memberExists);
    }
  } else {
    if (!name) {
      return fail(SUPER_ADMIN_ERRORS.required);
    }
    if (password.length < 8) {
      return fail(SUPER_ADMIN_ERRORS.passwordShort);
    }
    user = await systemDb.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
  }

  const role = await systemDb.role.findFirst({
    where: { organizationId: null, key: roleKey, isSystem: true },
  });
  if (!role) {
    return fail(SUPER_ADMIN_ERRORS.invalidRole);
  }

  await systemDb.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "member.added",
    summary: `Super Admin added ${email} to ${organization.name} as ${role.name}.`,
    metadata: { org: organization.name, email, role: role.name },
  });
  return { ok: true, id: organization.id };
}

async function loadMember(organizationId: string, memberId: string) {
  return systemDb.organizationMember.findFirst({
    where: { id: memberId, organizationId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, key: true, name: true } },
    },
  });
}

async function countOwners(organizationId: string): Promise<number> {
  return systemDb.organizationMember.count({
    where: { organizationId, status: "ACTIVE", role: { key: "owner" } },
  });
}

export async function updateMemberRole(
  actor: SuperAdminActor,
  organizationId: string,
  memberId: string,
  roleKey: string,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  if (!(MEMBER_ROLE_KEYS as readonly string[]).includes(roleKey)) {
    return fail(SUPER_ADMIN_ERRORS.invalidRole);
  }
  const member = await loadMember(organization.id, memberId);
  if (!member) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const role = await systemDb.role.findFirst({
    where: { organizationId: null, key: roleKey, isSystem: true },
  });
  if (!role) {
    return fail(SUPER_ADMIN_ERRORS.invalidRole);
  }
  if (member.roleId === role.id) {
    return { ok: true, id: organization.id };
  }
  if (member.role.key === "owner") {
    const owners = await countOwners(organization.id);
    if (owners <= 1) {
      return fail(SUPER_ADMIN_ERRORS.lastOwner);
    }
  }

  await systemDb.organizationMember.update({
    where: { id: member.id },
    data: { roleId: role.id },
  });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "member.roleChanged",
    summary: `Super Admin changed ${member.user.email}'s role in ${organization.name} to ${role.name}.`,
    metadata: { org: organization.name, email: member.user.email, role: role.name },
  });
  return { ok: true, id: organization.id };
}

export async function removeMember(
  actor: SuperAdminActor,
  organizationId: string,
  memberId: string,
): Promise<SuperAdminActionResult> {
  const organization = await loadClientOrganization(organizationId);
  if (!organization) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  const member = await loadMember(organization.id, memberId);
  if (!member) {
    return fail(SUPER_ADMIN_ERRORS.notFound);
  }
  if (member.role.key === "owner") {
    const owners = await countOwners(organization.id);
    if (owners <= 1) {
      return fail(SUPER_ADMIN_ERRORS.lastOwner);
    }
  }

  await systemDb.organizationMember.delete({ where: { id: member.id } });
  await logPlatformAudit(actor, {
    organizationId: organization.id,
    action: "member.removed",
    summary: `Super Admin removed ${member.user.email} from ${organization.name}.`,
    metadata: { org: organization.name, email: member.user.email },
  });
  return { ok: true, id: organization.id };
}
