import "./env";

import { getIndustryTemplate } from "../src/config/industry";
import {
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  SYSTEM_ROLE_LABELS,
} from "../src/server/auth/permissions";
import { hashPassword } from "../src/server/auth/password";
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_MAX_AGE_REMEMBER,
  signSessionToken,
} from "../src/server/auth/session-token";
import { systemDb } from "../src/server/db";
import { logActivity } from "../src/server/services/activity";
import { createOrganizationWithOwner } from "../src/server/services/organization";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SEED_PASSWORD = "Password123!";

const MODULES_SEED = [
  { key: "dashboard", name: "Dashboard", isCore: true, sortOrder: 0 },
  { key: "calendar", name: "Calendar", isCore: true, sortOrder: 10 },
  { key: "profile", name: "Profile", isCore: true, sortOrder: 20 },
  { key: "settings", name: "Settings", isCore: true, sortOrder: 30 },
  { key: "activity", name: "Activity Log", isCore: true, sortOrder: 40 },
  { key: "forms", name: "Forms", isCore: true, sortOrder: 50 },
  { key: "tables", name: "Tables", isCore: true, sortOrder: 60 },
  { key: "pages", name: "Pages", isCore: true, sortOrder: 70 },
  { key: "charts", name: "Charts", isCore: true, sortOrder: 80 },
  { key: "ui", name: "UI Elements", isCore: true, sortOrder: 90 },
  { key: "auth", name: "Authentication", isCore: true, sortOrder: 100 },
  { key: "crm", name: "CRM", isCore: false, sortOrder: 110 },
  { key: "sales", name: "Sales", isCore: false, sortOrder: 120 },
  { key: "tasks", name: "Tasks", isCore: false, sortOrder: 130 },
  { key: "projects", name: "Projects", isCore: false, sortOrder: 140 },
  { key: "finance", name: "Finance", isCore: false, sortOrder: 150 },
  { key: "reports", name: "Reports", isCore: false, sortOrder: 200 },
  { key: "invoicing", name: "Invoicing", isCore: false, sortOrder: 210 },
  { key: "inventory", name: "Inventory", isCore: false, sortOrder: 220 },
  { key: "products", name: "Products", isCore: false, sortOrder: 230 },
  { key: "orders", name: "Orders", isCore: false, sortOrder: 240 },
  { key: "suppliers", name: "Suppliers", isCore: false, sortOrder: 250 },
  { key: "students", name: "Students", isCore: false, sortOrder: 260 },
  { key: "courses", name: "Courses", isCore: false, sortOrder: 270 },
];

const ORG_BRANDING: Record<
  string,
  {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
    loginLogo?: string;
    loginBackground?: string;
    templateKey: string;
    enabledModules: string[];
  }
> = {
  "acme-bakery": {
    primaryColor: "#465fff",
    secondaryColor: "#2e90fa",
    logo: "/branding/org-a.svg",
    favicon: "/branding/org-a.svg",
    loginLogo: "/branding/org-a.svg",
    loginBackground: "/branding/login-bg.svg",
    templateKey: "retail",
    enabledModules: [
      "crm",
      "products",
      "inventory",
      "orders",
      "suppliers",
      "finance",
      "reports",
    ],
  },
  "globex-corp": {
    primaryColor: "#12b76a",
    secondaryColor: "#027a48",
    logo: "/branding/org-b.svg",
    favicon: "/branding/org-b.svg",
    loginLogo: "/branding/org-b.svg",
    templateKey: "agency",
    enabledModules: ["crm", "projects", "tasks", "finance", "reports"],
  },
  "vertex-studio": {
    primaryColor: "#f04438",
    secondaryColor: "#d92d20",
    logo: "/branding/org-c.svg",
    favicon: "/branding/org-c.svg",
    loginLogo: "/branding/org-c.svg",
    templateKey: "education",
    enabledModules: ["students", "courses", "tasks"],
  },
};

const CORE_MODULE_KEYS = [
  "dashboard",
  "calendar",
  "profile",
  "settings",
  "activity",
  "forms",
  "tables",
  "pages",
  "charts",
  "ui",
  "auth",
];

const PLANS_SEED = [
  {
    key: "FREE_TRIAL" as const,
    name: "Free Trial",
    description: "Explore the platform with a limited trial",
    priceCents: 0,
    currency: "USD",
    interval: "MONTH" as const,
    trialDays: 14,
    sortOrder: 0,
    limits: {
      maxUsers: 3,
      maxLeads: 5,
      maxCustomers: 3,
      maxProjects: 1,
      maxStorage: 1073741824,
      enabledModules: [
        ...CORE_MODULE_KEYS,
        "crm",
        "tasks",
        "students",
        "courses",
      ],
    },
  },
  {
    key: "STARTER" as const,
    name: "Starter",
    description: "For small teams getting started",
    priceCents: 1900,
    currency: "USD",
    interval: "MONTH" as const,
    trialDays: 0,
    sortOrder: 1,
    limits: {
      maxUsers: 5,
      maxLeads: 100,
      maxCustomers: 50,
      maxProjects: 5,
      maxStorage: 5368709120,
      enabledModules: [...CORE_MODULE_KEYS, "crm", "tasks", "sales"],
    },
  },
  {
    key: "BUSINESS" as const,
    name: "Business",
    description: "For growing teams that need more modules",
    priceCents: 4900,
    currency: "USD",
    interval: "MONTH" as const,
    trialDays: 0,
    sortOrder: 2,
    limits: {
      maxUsers: 15,
      maxLeads: 1000,
      maxCustomers: 500,
      maxProjects: 25,
      maxStorage: 21474836480,
      enabledModules: [
        ...CORE_MODULE_KEYS,
        "crm",
        "tasks",
        "sales",
        "projects",
        "finance",
        "reports",
      ],
    },
  },
  {
    key: "PROFESSIONAL" as const,
    name: "Professional",
    description: "For organizations running the full stack",
    priceCents: 9900,
    currency: "USD",
    interval: "MONTH" as const,
    trialDays: 0,
    sortOrder: 3,
    limits: {
      maxUsers: 50,
      maxLeads: 10000,
      maxCustomers: 5000,
      maxProjects: 100,
      maxStorage: 107374182400,
      enabledModules: [
        ...CORE_MODULE_KEYS,
        "crm",
        "sales",
        "tasks",
        "projects",
        "finance",
        "reports",
        "invoicing",
        "products",
        "inventory",
        "orders",
        "suppliers",
      ],
    },
  },
  {
    key: "ENTERPRISE" as const,
    name: "Enterprise",
    description: "Unlimited everything with every module",
    priceCents: 99900,
    currency: "USD",
    interval: "YEAR" as const,
    trialDays: 0,
    sortOrder: 4,
    limits: {
      maxUsers: null,
      maxLeads: null,
      maxCustomers: null,
      maxProjects: null,
      maxStorage: null,
      enabledModules: null,
    },
  },
];

async function ensureUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const existing = await systemDb.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    return systemDb.user.update({
      where: { id: existing.id },
      data: { passwordHash: input.passwordHash, status: "ACTIVE" },
    });
  }
  return systemDb.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
}

async function ensureMembership(input: {
  organizationId: string;
  userId: string;
  roleKey: string;
}) {
  const role = await systemDb.role.findFirst({
    where: { organizationId: null, key: input.roleKey, isSystem: true },
  });
  if (!role) {
    throw new Error(`System role "${input.roleKey}" not found.`);
  }
  const existing = await systemDb.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
  });
  if (existing) {
    return systemDb.organizationMember.update({
      where: { id: existing.id },
      data: { roleId: role.id, status: "ACTIVE" },
    });
  }
  return systemDb.organizationMember.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
}

async function ensureOrganizationModules(organizationId: string) {
  const modules = await systemDb.module.findMany();
  if (modules.length === 0) {
    return;
  }
  await systemDb.organizationModule.createMany({
    data: modules.map((mod) => ({
      organizationId,
      moduleId: mod.id,
      enabled: mod.isCore,
      enabledAt: mod.isCore ? new Date() : null,
    })),
    skipDuplicates: true,
  });
}

async function enableModules(organizationId: string, moduleKeys: string[]) {
  const desired = new Set(moduleKeys);
  const modules = await systemDb.module.findMany();
  for (const mod of modules) {
    const enabled = mod.isCore || desired.has(mod.key);
    await systemDb.organizationModule.upsert({
      where: {
        organizationId_moduleId: { organizationId, moduleId: mod.id },
      },
      update: { enabled, enabledAt: enabled ? new Date() : null },
      create: {
        organizationId,
        moduleId: mod.id,
        enabled,
        enabledAt: enabled ? new Date() : null,
      },
    });
  }
}

async function applySeedTemplate(
  organizationId: string,
  templateKey: string,
) {
  const template = getIndustryTemplate(templateKey);
  await systemDb.organization.update({
    where: { id: organizationId },
    data: { templateKey: template.key },
  });
  if (!template.customRoles || template.customRoles.length === 0) {
    return;
  }
  const permissionRows = await systemDb.permission.findMany({
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(
    permissionRows.map((row) => [row.key, row.id]),
  );
  for (const customRole of template.customRoles) {
    const existing = await systemDb.role.findFirst({
      where: { organizationId, key: customRole.key },
    });
    const role =
      existing ??
      (await systemDb.role.create({
        data: {
          organizationId,
          key: customRole.key,
          name: customRole.name,
          description: customRole.description ?? null,
          isSystem: false,
        },
      }));
    const desiredPermissionIds = customRole.permissions
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is string => Boolean(id));
    if (desiredPermissionIds.length === 0) {
      continue;
    }
    await systemDb.rolePermission.createMany({
      data: desiredPermissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }
}

async function applyBranding(
  organizationId: string,
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
    loginLogo?: string;
    loginBackground?: string;
  },
) {
  await systemDb.organization.update({
    where: { id: organizationId },
    data: {
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      logo: branding.logo,
      favicon: branding.favicon,
      loginLogo: branding.loginLogo ?? null,
      loginBackground: branding.loginBackground ?? null,
    },
  });
}

interface TestAccount {
  email: string;
  token: string;
  organizationId: string;
  organizationSlug: string;
  role: string;
}

async function issueTestSession(input: {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  role: string;
}): Promise<TestAccount> {
  const token = generateSessionToken();
  await systemDb.session.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_REMEMBER * 1000),
      ip: "127.0.0.1",
      userAgent: "seed-script",
    },
  });
  return {
    email: "",
    token: signSessionToken(token),
    organizationId: input.organizationId,
    organizationSlug: input.organizationSlug,
    role: input.role,
  };
}


interface CrmSeedInput {
  organizationId: string;
  actorIds: string[];
  variant: "a" | "b" | "c";
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function nextPeriodEnd(interval: string, from: Date): Date {
  const end = new Date(from);
  if (interval === "YEAR") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end;
}

async function ensureOrgSubscription(
  organizationId: string,
  planKey: (typeof PLANS_SEED)[number]["key"],
  state: "ACTIVE" | "TRIAL",
): Promise<void> {
  const plan = await systemDb.plan.findUnique({ where: { key: planKey } });
  if (!plan) {
    return;
  }
  const now = new Date();
  const trialEndsAt =
    state === "TRIAL" && plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;
  const subscription = await systemDb.subscription.upsert({
    where: { organizationId },
    update: {
      planId: plan.id,
      state,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? nextPeriodEnd(plan.interval, now),
      trialEndsAt,
      cancelAtPeriodEnd: false,
      endedAt: null,
    },
    create: {
      organizationId,
      planId: plan.id,
      state,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? nextPeriodEnd(plan.interval, now),
      trialEndsAt,
    },
  });
  const eventCount = await systemDb.subscriptionEvent.count({
    where: { organizationId },
  });
  if (eventCount > 0) {
    return;
  }
  const events: {
    type: "CREATED" | "PLAN_CHANGED";
    toState: typeof state;
    planKey: typeof plan.key;
  }[] = [{ type: "CREATED", toState: state, planKey: plan.key }];
  if (planKey !== "FREE_TRIAL") {
    events.push({
      type: "PLAN_CHANGED",
      toState: state,
      planKey: plan.key,
    });
  }
  await systemDb.subscriptionEvent.createMany({
    data: events.map((event) => ({
      organizationId,
      subscriptionId: subscription.id,
      type: event.type,
      toState: event.toState,
      planKey: event.planKey,
      metadata: { seeded: true },
    })),
  });
}

async function seedCrmForOrg(input: CrmSeedInput) {
  const { organizationId, actorIds, variant } = input;
  const existingLeads = await systemDb.crmLead.count({
    where: { organizationId },
  });
  if (existingLeads > 0) {
    return;
  }

  const leadSets: Record<
    "a" | "b" | "c",
    {
      name: string;
      email: string;
      phone: string;
      company: string;
      source: "WEB_FORM" | "REFERRAL" | "SOCIAL" | "ADS" | "COLD_CALL" | "EVENT";
      status: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      assignee: number;
      notes: string;
    }[]
  > = {
    a: [
      { name: "Olivia Martin", email: "olivia@sunrise-retail.test", phone: "+1 555 0101", company: "Sunrise Retail", source: "WEB_FORM", status: "QUALIFIED", priority: "HIGH", assignee: 0, notes: "Wants a bakery supply pilot for Q1." },
      { name: "Jackson Lee", email: "jackson@northwind-labs.test", phone: "+1 555 0102", company: "Northwind Labs", source: "REFERRAL", status: "PROPOSAL", priority: "URGENT", assignee: 0, notes: "Proposal sent, waiting on procurement." },
      { name: "Sophia Patel", email: "sophia@blueharbor.test", phone: "+1 555 0103", company: "Blue Harbor Co.", source: "SOCIAL", status: "CONTACTED", priority: "MEDIUM", assignee: 1, notes: "" },
      { name: "Liam Garcia", email: "liam@quantumfoods.test", phone: "+1 555 0104", company: "Quantum Foods", source: "ADS", status: "NEW", priority: "MEDIUM", assignee: 1, notes: "" },
      { name: "Emma Wilson", email: "emma@cedarpine.test", phone: "+1 555 0105", company: "Cedar & Pine", source: "EVENT", status: "WON", priority: "HIGH", assignee: 0, notes: "Signed annual contract." },
      { name: "Noah Thompson", email: "noah@atlaslog.test", phone: "+1 555 0106", company: "Atlas Logistics", source: "COLD_CALL", status: "LOST", priority: "LOW", assignee: 1, notes: "Budget frozen until next year." },
      { name: "Ava Robinson", email: "ava@velvetthread.test", phone: "+1 555 0107", company: "Velvet Thread", source: "WEB_FORM", status: "NEW", priority: "HIGH", assignee: 0, notes: "" },
      { name: "Ethan Clark", email: "ethan@ironwood.test", phone: "+1 555 0108", company: "Ironwood Media", source: "REFERRAL", status: "CONTACTED", priority: "LOW", assignee: 1, notes: "" },
    ],
    b: [
      { name: "Mia Hernandez", email: "mia@cloudspire.test", phone: "+44 20 7946 0101", company: "Cloudspire Inc.", source: "WEB_FORM", status: "NEW", priority: "MEDIUM", assignee: 0, notes: "Inbound demo request." },
      { name: "Lucas Bennett", email: "lucas@brightpath.test", phone: "+44 20 7946 0102", company: "Bright Path LLC", source: "ADS", status: "CONTACTED", priority: "HIGH", assignee: 0, notes: "" },
      { name: "Amelia Scott", email: "amelia@redwood.test", phone: "+44 20 7946 0103", company: "Redwood Systems", source: "EVENT", status: "QUALIFIED", priority: "URGENT", assignee: 0, notes: "Met at SaaS Summit." },
    ],
    c: [
      { name: "Nora Ellis", email: "nora@brightpath-studio.test", phone: "+1 555 0109", company: "Brightpath Studio", source: "WEB_FORM", status: "NEW", priority: "MEDIUM", assignee: 0, notes: "Trial user from the pricing page." },
      { name: "Owen Clarke", email: "owen@mapleleaf.test", phone: "+1 555 0110", company: "Maple & Leaf", source: "REFERRAL", status: "CONTACTED", priority: "HIGH", assignee: 0, notes: "" },
      { name: "Priya Nair", email: "priya@velvetink.test", phone: "+1 555 0111", company: "Velvet Ink", source: "SOCIAL", status: "QUALIFIED", priority: "HIGH", assignee: 0, notes: "Asked about the Starter plan." },
      { name: "Diego Ramos", email: "diego@coastalwaves.test", phone: "+1 555 0112", company: "Coastal Waves", source: "ADS", status: "NEW", priority: "LOW", assignee: 0, notes: "" },
      { name: "Hana Sato", email: "hana@paperlantern.test", phone: "+1 555 0113", company: "Paper Lantern", source: "EVENT", status: "PROPOSAL", priority: "URGENT", assignee: 0, notes: "Trial ends soon — follow up before expiry." },
    ],
  };

  const companySets: Record<
    "a" | "b" | "c",
    {
      name: string;
      website: string;
      industry: string;
      email: string;
      phone: string;
      size: string;
    }[]
  > = {
    a: [
      { name: "Sunrise Retail", website: "sunrise-retail.test", industry: "Retail", email: "hello@sunrise-retail.test", phone: "+1 555 0201", size: "50-200" },
      { name: "Northwind Labs", website: "northwind-labs.test", industry: "Research", email: "team@northwind-labs.test", phone: "+1 555 0202", size: "10-50" },
      { name: "Blue Harbor Co.", website: "blueharbor.test", industry: "Hospitality", email: "info@blueharbor.test", phone: "+1 555 0203", size: "200-500" },
    ],
    b: [
      { name: "Cloudspire Inc.", website: "cloudspire.test", industry: "Technology", email: "hello@cloudspire.test", phone: "+44 20 7946 0201", size: "500+" },
      { name: "Redwood Systems", website: "redwood.test", industry: "Technology", email: "sales@redwood.test", phone: "+44 20 7946 0202", size: "50-200" },
    ],
    c: [],
  };

  const customerSets: Record<
    "a" | "b" | "c",
    { name: string; email: string; phone: string; company: string; status: "ACTIVE" | "INACTIVE" | "CHURNED"; assignee: number }[]
  > = {
    a: [
      { name: "Emma Wilson", email: "emma@cedarpine.test", phone: "+1 555 0105", company: "Cedar & Pine", status: "ACTIVE", assignee: 0 },
      { name: "Harper Adams", email: "harper@goldenhour.test", phone: "+1 555 0301", company: "Golden Hour Cafe", status: "ACTIVE", assignee: 1 },
      { name: "Benjamin Reed", email: "ben@riverstone.test", phone: "+1 555 0302", company: "Riverstone Bistro", status: "INACTIVE", assignee: 0 },
      { name: "Isabella Foster", email: "isabella@maplemart.test", phone: "+1 555 0303", company: "Maple Mart", status: "CHURNED", assignee: 1 },
    ],
    b: [
      { name: "James Carter", email: "james@peakform.test", phone: "+44 20 7946 0301", company: "Peakform Ltd", status: "ACTIVE", assignee: 0 },
    ],
    c: [],
  };

  const taskSets: Record<
    "a" | "b" | "c",
    {
      title: string;
      description: string;
      status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      dueIn: number;
      assignee: number;
      withLead: number | null;
    }[]
  > = {
    a: [
      { title: "Send revised proposal to Jackson", description: "Include volume pricing options.", status: "IN_PROGRESS", priority: "URGENT", dueIn: 1, assignee: 0, withLead: 1 },
      { title: "Call Olivia about pilot scope", description: "Confirm delivery schedule.", status: "OPEN", priority: "HIGH", dueIn: 2, assignee: 0, withLead: 0 },
      { title: "Follow up with Sophia", description: "Share case studies.", status: "OPEN", priority: "MEDIUM", dueIn: 4, assignee: 1, withLead: 2 },
      { title: "Prepare onboarding kit for Cedar & Pine", description: "", status: "DONE", priority: "MEDIUM", dueIn: -2, assignee: 0, withLead: 4 },
      { title: "Quarterly review with Golden Hour Cafe", description: "Review usage and renew.", status: "OPEN", priority: "HIGH", dueIn: 7, assignee: 1, withLead: null },
      { title: "Clean up lost lead notes", description: "", status: "OPEN", priority: "LOW", dueIn: 10, assignee: 1, withLead: 5 },
    ],
    b: [
      { title: "Book demo with Cloudspire", description: "Coordinate with their platform team.", status: "OPEN", priority: "HIGH", dueIn: 3, assignee: 0, withLead: 0 },
      { title: "Send Summit follow-up deck", description: "", status: "IN_PROGRESS", priority: "MEDIUM", dueIn: 1, assignee: 0, withLead: 2 },
    ],
    c: [],
  };

  console.log(`Seeding CRM data (${variant.toUpperCase()})...`);

  const companyIds: string[] = [];
  for (const company of companySets[variant]) {
    const row = await systemDb.crmCompany.create({
      data: { organizationId, ...company },
    });
    companyIds.push(row.id);
  }

  const leadIds: string[] = [];
  for (const lead of leadSets[variant]) {
    const row = await systemDb.crmLead.create({
      data: {
        organizationId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        status: lead.status,
        priority: lead.priority,
        assignedToId: actorIds[lead.assignee] ?? actorIds[0] ?? null,
        notes: lead.notes,
      },
    });
    leadIds.push(row.id);
    await systemDb.crmActivity.create({
      data: {
        organizationId,
        type: "CREATED",
        subject: `Lead ${lead.name} created`,
        actorId: actorIds[lead.assignee] ?? actorIds[0] ?? null,
        leadId: row.id,
      },
    });
    if (lead.status !== "NEW") {
      await systemDb.crmActivity.create({
        data: {
          organizationId,
          type: "STATUS_CHANGE",
          subject: `Status changed to ${lead.status}`,
          description: `Moved from NEW to ${lead.status}.`,
          actorId: actorIds[lead.assignee] ?? actorIds[0] ?? null,
          leadId: row.id,
          occurredAt: daysFromNow(-2),
        },
      });
    }
  }

  const contactCount = variant === "a" ? 6 : variant === "c" ? 0 : 2;
  for (let i = 0; i < contactCount; i++) {
    const lead = leadSets[variant][i % leadSets[variant].length];
    await systemDb.crmContact.create({
      data: {
        organizationId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        jobTitle: ["Director", "Founder", "Manager", "Analyst"][i % 4],
        companyId: companyIds[i % companyIds.length] ?? null,
        assignedToId: actorIds[lead.assignee] ?? actorIds[0] ?? null,
      },
    });
  }

  for (const customer of customerSets[variant]) {
    await systemDb.crmCustomer.create({
      data: {
        organizationId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        status: customer.status,
        assignedToId: actorIds[customer.assignee] ?? actorIds[0] ?? null,
      },
    });
  }

  for (const task of taskSets[variant]) {
    await systemDb.crmTask.create({
      data: {
        organizationId,
        title: task.title,
        description: task.description || null,
        status: task.status,
        priority: task.priority,
        dueAt: daysFromNow(task.dueIn),
        assignedToId: actorIds[task.assignee] ?? actorIds[0] ?? null,
        leadId:
          task.withLead !== null && leadIds[task.withLead]
            ? leadIds[task.withLead]
            : null,
      },
    });
  }

  if (leadIds.length > 0) {
    await systemDb.crmNote.create({
      data: {
        organizationId,
        body: "Warm intro from the trade show — decision maker is involved.",
        authorId: actorIds[0] ?? null,
        leadId: leadIds[0],
      },
    });
    await systemDb.crmFollowUp.create({
      data: {
        organizationId,
        type: "CALL",
        dueAt: daysFromNow(1),
        notes: "Pricing call",
        leadId: leadIds[0],
        assignedToId: actorIds[0] ?? null,
      },
    });
    await systemDb.crmFollowUp.create({
      data: {
        organizationId,
        type: "EMAIL",
        dueAt: daysFromNow(3),
        notes: "Send onboarding checklist",
        leadId: leadIds[1 % leadIds.length],
        assignedToId: actorIds[0] ?? null,
      },
    });
    await systemDb.crmActivity.create({
      data: {
        organizationId,
        type: "CALL",
        subject: "Discovery call completed",
        description: "Discussed requirements and timeline.",
        actorId: actorIds[0] ?? null,
        leadId: leadIds[0],
        occurredAt: daysFromNow(-1),
      },
    });
  }
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.");
  }

  console.log("Seeding permissions...");
  for (const entry of PERMISSION_CATALOG) {
    await systemDb.permission.upsert({
      where: { key: entry.key },
      update: { name: entry.name, description: entry.description, group: entry.group },
      create: {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        group: entry.group,
      },
    });
  }

  console.log("Seeding system roles...");
  const permissionRows = await systemDb.permission.findMany();
  const permissionIdByKey = new Map(
    permissionRows.map((row) => [row.key, row.id]),
  );

  for (const roleKey of Object.values(SYSTEM_ROLES)) {
    const role =
      (await systemDb.role.findFirst({
        where: { organizationId: null, key: roleKey },
      })) ??
      (await systemDb.role.create({
        data: {
          organizationId: null,
          key: roleKey,
          name: SYSTEM_ROLE_LABELS[roleKey],
          isSystem: true,
        },
      }));

    const desiredPermissionIds = ROLE_PERMISSIONS[roleKey]
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is string => Boolean(id));

    await systemDb.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (desiredPermissionIds.length > 0) {
      await systemDb.rolePermission.createMany({
        data: desiredPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
  }

  console.log("Seeding modules...");
  for (const mod of MODULES_SEED) {
    await systemDb.module.upsert({
      where: { key: mod.key },
      update: { name: mod.name, isCore: mod.isCore, sortOrder: mod.sortOrder },
      create: mod,
    });
  }

  console.log("Seeding plans...");
  for (const plan of PLANS_SEED) {
    await systemDb.plan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        currency: plan.currency,
        interval: plan.interval,
        trialDays: plan.trialDays,
        limits: plan.limits,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
  }

  console.log("Seeding test users and organizations...");
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const ownerA = await ensureUser({
    email: "owner-a@org-a.test",
    name: "Alex Rivera",
    passwordHash,
  });
  const ownerB = await ensureUser({
    email: "owner-b@org-b.test",
    name: "Blake Chen",
    passwordHash,
  });
  const ownerC = await ensureUser({
    email: "owner-c@org-c.test",
    name: "Casey Morgan",
    passwordHash,
  });
  const viewerA = await ensureUser({
    email: "viewer-a@org-a.test",
    name: "Vera Diaz",
    passwordHash,
  });

  let orgA = await systemDb.organization.findUnique({
    where: { slug: "acme-bakery" },
  });
  if (!orgA) {
    orgA = await createOrganizationWithOwner({
      name: "Acme Bakery",
      ownerId: ownerA.id,
      businessType: "bakery",
      currency: "USD",
      timezone: "America/New_York",
    });
  }

  let orgB = await systemDb.organization.findUnique({
    where: { slug: "globex-corp" },
  });
  if (!orgB) {
    orgB = await createOrganizationWithOwner({
      name: "Globex Corp",
      ownerId: ownerB.id,
      businessType: "software",
      currency: "USD",
      timezone: "Europe/London",
    });
  }

  let orgC = await systemDb.organization.findUnique({
    where: { slug: "vertex-studio" },
  });
  if (!orgC) {
    orgC = await createOrganizationWithOwner({
      name: "Vertex Studio",
      ownerId: ownerC.id,
      businessType: "design",
      currency: "USD",
      timezone: "America/Los_Angeles",
    });
  }

  const superAdminUser = await ensureUser({
    email: "super@platform.test",
    name: "Sam Whitaker",
    passwordHash,
  });

  let platformOrg = await systemDb.organization.findUnique({
    where: { slug: "platform-hq" },
  });
  if (!platformOrg) {
    platformOrg = await systemDb.organization.create({
      data: {
        name: "Platform HQ",
        slug: "platform-hq",
        businessType: "platform",
        isPlatform: true,
        timezone: "UTC",
        currency: "USD",
      },
    });
  } else if (!platformOrg.isPlatform) {
    platformOrg = await systemDb.organization.update({
      where: { id: platformOrg.id },
      data: { isPlatform: true },
    });
  }
  await ensureMembership({
    organizationId: platformOrg.id,
    userId: superAdminUser.id,
    roleKey: "super_admin",
  });
  await ensureOrganizationModules(platformOrg.id);

  await ensureMembership({
    organizationId: orgA.id,
    userId: viewerA.id,
    roleKey: "viewer",
  });

  for (const [slug, org] of [
    ["acme-bakery", orgA],
    ["globex-corp", orgB],
    ["vertex-studio", orgC],
  ] as const) {
    const branding = ORG_BRANDING[slug];
    if (!branding) {
      continue;
    }
    await ensureOrganizationModules(org.id);
    await enableModules(org.id, branding.enabledModules);
    await applyBranding(org.id, branding);
    await applySeedTemplate(org.id, branding.templateKey);
  }

  await ensureOrgSubscription(orgA.id, "PROFESSIONAL", "ACTIVE");
  await ensureOrgSubscription(orgB.id, "BUSINESS", "ACTIVE");
  await ensureOrgSubscription(orgC.id, "FREE_TRIAL", "TRIAL");

  await seedCrmForOrg({
    organizationId: orgA.id,
    actorIds: [ownerA.id, viewerA.id],
    variant: "a",
  });
  await seedCrmForOrg({
    organizationId: orgB.id,
    actorIds: [ownerB.id],
    variant: "b",
  });
  await seedCrmForOrg({
    organizationId: orgC.id,
    actorIds: [ownerC.id],
    variant: "c",
  });

  console.log("Seeding activity markers...");
  await logActivity(orgA.id, {
    action: "seed.org_a_marker",
    actorId: ownerA.id,
    entity: "test",
    level: "AUDIT",
    metadata: { organization: "A", secret: "ORG_A_MUST_NOT_LEAK" },
  });
  await logActivity(orgB.id, {
    action: "seed.org_b_marker",
    actorId: ownerB.id,
    entity: "test",
    level: "AUDIT",
    metadata: { organization: "B", secret: "ORG_B_MUST_NOT_LEAK" },
  });

  console.log("Issuing test sessions...");
  const accounts: Record<string, TestAccount> = {
    ownerA: await issueTestSession({
      userId: ownerA.id,
      organizationId: orgA.id,
      organizationSlug: orgA.slug,
      role: "owner",
    }),
    ownerB: await issueTestSession({
      userId: ownerB.id,
      organizationId: orgB.id,
      organizationSlug: orgB.slug,
      role: "owner",
    }),
    ownerC: await issueTestSession({
      userId: ownerC.id,
      organizationId: orgC.id,
      organizationSlug: orgC.slug,
      role: "owner",
    }),
    viewerA: await issueTestSession({
      userId: viewerA.id,
      organizationId: orgA.id,
      organizationSlug: orgA.slug,
      role: "viewer",
    }),
    superAdmin: await issueTestSession({
      userId: superAdminUser.id,
      organizationId: platformOrg.id,
      organizationSlug: platformOrg.slug,
      role: "super_admin",
    }),
  };
  accounts.ownerA.email = ownerA.email;
  accounts.ownerB.email = ownerB.email;
  accounts.ownerC.email = ownerC.email;
  accounts.viewerA.email = viewerA.email;
  accounts.superAdmin.email = superAdminUser.email;

  const tokensPath = resolve(process.cwd(), "prisma/.test-tokens.json");
  writeFileSync(tokensPath, JSON.stringify(accounts, null, 2) + "\n");

  console.log("");
  console.log("Seed complete.");
  console.log("  Organization A:", orgA.name, `(${orgA.slug})`, orgA.id);
  console.log("  Organization B:", orgB.name, `(${orgB.slug})`, orgB.id);
  console.log("  Organization C:", orgC.name, `(${orgC.slug})`, orgC.id);
  console.log("  Platform:", platformOrg.name, `(${platformOrg.slug})`, platformOrg.id);
  console.log("");
  console.log("Test logins (password: " + SEED_PASSWORD + "):");
  console.log("  owner-a@org-a.test  ->", orgA.slug, "[owner]");
  console.log("  viewer-a@org-a.test ->", orgA.slug, "[viewer]");
  console.log("  owner-b@org-b.test  ->", orgB.slug, "[owner]");
  console.log("  owner-c@org-c.test  ->", orgC.slug, "[owner]");
  console.log("  super@platform.test ->", platformOrg.slug, "[super_admin]");
  console.log("");
  console.log("Test session cookies written to prisma/.test-tokens.json");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
