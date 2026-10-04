import "@/server/db/env-loader";

import {
  DEFAULT_INDUSTRY_TEMPLATE,
  DASHBOARD_WIDGET_KEYS,
  INDUSTRY_TEMPLATE_KEYS,
  INDUSTRY_TEMPLATES,
  applyTemplateNav,
  getIndustryTemplate,
  getTemplatePermissionExtras,
  getTemplateTerm,
  isIndustryTemplateKey,
} from "@/config/industry";
import {
  ALL_PERMISSION_KEYS,
  PERMISSIONS,
  withTemplatePermissionExtras,
} from "@/server/auth/permissions";
import { systemDb } from "@/server/db";
import {
  SUPER_ADMIN_ERRORS,
  createOrganization,
  getOrganizationDetail,
} from "@/server/services/super-admin";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function expect(condition: unknown, label: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`PASS: ${label}`);
}

const KNOWN_NAV_KEYS = [
  "dashboard",
  "crm",
  "sales",
  "tasks",
  "projects",
  "products",
  "inventory",
  "orders",
  "suppliers",
  "students",
  "courses",
  "staff",
  "finance",
  "reports",
  "settings",
];

const KNOWN_CHILD_KEYS: Record<string, string[]> = {
  crm: [
    "overview",
    "leads",
    "contacts",
    "customers",
    "companies",
    "activities",
    "tasks",
  ],
  sales: ["deals"],
  finance: ["invoices", "expenses"],
  settings: [
    "overview",
    "business",
    "branding",
    "users",
    "roles",
    "modules",
  ],
};

interface FakeItem {
  key: string;
  path?: string;
  templateOnly?: boolean;
  subItems?: { key: string; path: string }[];
}

const fakeNav: FakeItem[] = [
  { key: "dashboard", path: "/dashboard" },
  {
    key: "crm",
    subItems: [
      { key: "overview", path: "/crm" },
      { key: "leads", path: "/crm/leads" },
      { key: "customers", path: "/crm/customers" },
      { key: "companies", path: "/crm/companies" },
    ],
  },
  { key: "sales", path: "/sales" },
  { key: "products", path: "/products" },
  { key: "staff", path: "/settings/users", templateOnly: true },
  { key: "reports", path: "/reports" },
  { key: "settings", path: "/settings" },
];

function keysOf(items: FakeItem[]): string[] {
  return items.map((item) => item.key);
}

async function main() {
  const messages = JSON.parse(
    readFileSync(resolve(process.cwd(), "src/messages/en.json"), "utf8"),
  );

  expect(
    INDUSTRY_TEMPLATE_KEYS.length === 6,
    "registry exposes 6 industry templates",
  );
  expect(
    isIndustryTemplateKey(DEFAULT_INDUSTRY_TEMPLATE),
    "the default template key is valid",
  );
  expect(
    getIndustryTemplate("not-a-template").key === DEFAULT_INDUSTRY_TEMPLATE,
    "unknown template keys fall back to the default",
  );
  expect(
    !isIndustryTemplateKey("nope") && isIndustryTemplateKey("retail"),
    "isIndustryTemplateKey validates template keys",
  );

  const modules = await systemDb.module.findMany({
    select: { key: true, isCore: true },
  });
  const moduleKeys = new Set(modules.map((module) => module.key));
  const permissionKeys = new Set(ALL_PERMISSION_KEYS);

  for (const templateKey of INDUSTRY_TEMPLATE_KEYS) {
    const template = INDUSTRY_TEMPLATES[templateKey];
    expect(template.key === templateKey, `${templateKey}: key matches`);
    expect(
      template.modules.length > 0,
      `${templateKey}: defines default modules`,
    );
    expect(
      template.modules.every(
        (moduleKey) => moduleKeys.has(moduleKey) && moduleKey !== undefined,
      ),
      `${templateKey}: default modules exist in the catalog`,
    );
    expect(
      template.nav[0]?.key === "dashboard",
      `${templateKey}: navigation starts with the dashboard`,
    );
    expect(
      template.nav[template.nav.length - 1]?.key === "settings",
      `${templateKey}: navigation ends with settings`,
    );
    expect(
      template.nav.every((entry) => KNOWN_NAV_KEYS.includes(entry.key)),
      `${templateKey}: navigation keys are known`,
    );
    expect(
      template.nav.every((entry) => {
        if (!entry.children) {
          return true;
        }
        const known = KNOWN_CHILD_KEYS[entry.key];
        return (
          known !== undefined &&
          entry.children.every((child) => known.includes(child))
        );
      }),
      `${templateKey}: navigation children are known`,
    );
    expect(
      template.widgets.every((widget) =>
        DASHBOARD_WIDGET_KEYS.includes(widget.key),
      ),
      `${templateKey}: widget keys are known`,
    );
    expect(
      template.widgets.every(
        (widget) => !widget.module || template.modules.includes(widget.module),
      ),
      `${templateKey}: widget modules are enabled by the template`,
    );
    for (const role of template.customRoles ?? []) {
      expect(
        role.permissions.every((key) => permissionKeys.has(key)),
        `${templateKey}: custom role ${role.key} only grants catalog permissions`,
      );
      expect(
        role.permissions.length > 0,
        `${templateKey}: custom role ${role.key} grants permissions`,
      );
    }
    for (const extras of Object.values(
      template.rolePermissionExtras ?? {},
    )) {
      expect(
        (extras ?? []).every((key) => permissionKeys.has(key)),
        `${templateKey}: permission extras stay in the catalog`,
      );
    }
    for (const termKey of Object.keys(template.terms ?? {})) {
      const navKeys = template.nav.flatMap((entry) => [
        entry.key,
        ...(entry.children ?? []),
      ]);
      expect(
        navKeys.includes(termKey) ||
          template.widgets.some((widget) => widget.key === termKey),
        `${templateKey}: term ${termKey} maps to a nav entry or widget`,
      );
    }
  }

  const widgetModules = new Set(
    INDUSTRY_TEMPLATE_KEYS.flatMap((key) =>
      INDUSTRY_TEMPLATES[key].widgets.map((widget) => widget.key),
    ),
  );
  expect(
    [...widgetModules].every((key) => DASHBOARD_WIDGET_KEYS.includes(key)),
    "templates only reference registered dashboard widgets",
  );

  const retailNav = applyTemplateNav(fakeNav, INDUSTRY_TEMPLATES.retail);
  expect(
    keysOf(retailNav).join(",") ===
      "dashboard,products,crm,reports,sales,settings",
    "template navigation orders listed items and appends gated extras",
  );
  expect(
    retailNav[retailNav.length - 1]?.key === "settings",
    "settings is pinned to the end of the navigation",
  );
  expect(
    keysOf(retailNav[2].subItems ?? []).join(",") === "customers",
    "template navigation filters submenu children",
  );
  expect(
    !keysOf(retailNav).includes("staff"),
    "template-only entries stay hidden outside their template",
  );

  const restaurantNav = applyTemplateNav(
    fakeNav,
    INDUSTRY_TEMPLATES.restaurant,
  );
  expect(
    keysOf(restaurantNav).join(",") ===
      "dashboard,products,crm,staff,reports,sales,settings",
    "restaurant navigation includes the staff entry",
  );

  const noSales = applyTemplateNav(fakeNav, INDUSTRY_TEMPLATES.retail, {
    isItemVisible: (item) => item.key !== "sales",
  });
  expect(
    !keysOf(noSales).includes("sales"),
    "visibility gating removes unlisted items",
  );

  const noCustomers = applyTemplateNav(fakeNav, INDUSTRY_TEMPLATES.retail, {
    isChildVisible: (child) => child.key !== "customers",
  });
  expect(
    !keysOf(noCustomers).includes("crm"),
    "a parent is dropped when no template children remain",
  );

  const retailViewerExtras = getTemplatePermissionExtras("retail", "viewer");
  expect(
    retailViewerExtras.includes(PERMISSIONS.PRODUCTS_READ) &&
      retailViewerExtras.includes(PERMISSIONS.INVENTORY_READ),
    "the retail template grants catalog reads to viewers",
  );
  expect(
    getTemplatePermissionExtras("general", "viewer").length === 0,
    "the general template adds no permission extras",
  );
  expect(
    withTemplatePermissionExtras(
      [PERMISSIONS.DASHBOARD_READ],
      [PERMISSIONS.DASHBOARD_READ, PERMISSIONS.PRODUCTS_READ],
    ).length === 2,
    "template permission extras are merged without duplicates",
  );

  expect(getTemplateTerm("restaurant", "products") === "Menu", "terminology resolves menu labels");
  expect(getTemplateTerm("agency", "customers") === "Clients", "terminology resolves client labels");
  expect(
    getTemplateTerm("general", "products") === undefined,
    "terminology falls back when no term exists",
  );

  expect(
    Array.isArray(messages.templates?.names) === false &&
      Object.keys(messages.templates?.names ?? {}).length === 6,
    "messages define all 6 template names",
  );
  expect(
    messages.templates?.terms?.restaurant?.products === "Menu",
    "messages carry restaurant terminology",
  );
  expect(
    messages.superAdmin?.errors?.invalidTemplate !== undefined,
    "messages define the invalid template error",
  );
  expect(
    messages.superAdmin?.organizations?.createModal?.template !== undefined,
    "messages define the create-modal template field",
  );
  expect(
    messages.settings?.industryTemplate !== undefined,
    "messages define the settings template label",
  );
  expect(
    messages.settings?.permissionGroups?.catalog !== undefined &&
      messages.settings?.permissionGroups?.education !== undefined,
    "messages define the new permission groups",
  );
  expect(
    messages.dashboard?.widgets?.recentOrders !== undefined &&
      messages.dashboard?.widgets?.topProducts !== undefined &&
      messages.dashboard?.widgets?.lowStock !== undefined &&
      messages.dashboard?.widgets?.recentTasks !== undefined &&
      messages.dashboard?.widgets?.recentStudents !== undefined,
    "messages define every dashboard widget",
  );
  for (const itemKey of [
    "inventory",
    "orders",
    "suppliers",
    "students",
    "courses",
    "staff",
  ]) {
    expect(
      messages.sidebar?.items?.[itemKey] !== undefined,
      `sidebar label exists for ${itemKey}`,
    );
  }

  const plans = await systemDb.plan.findMany({
    select: { key: true, limits: true },
  });
  const limitsOf = (key: string): { enabledModules?: string[] | null } => {
    const plan = plans.find((row) => row.key === key);
    return (plan?.limits ?? {}) as { enabledModules?: string[] | null };
  };
  const professionalModules = limitsOf("PROFESSIONAL").enabledModules ?? [];
  const businessModules = limitsOf("BUSINESS").enabledModules ?? [];
  const trialModules = limitsOf("FREE_TRIAL").enabledModules ?? [];
  expect(
    INDUSTRY_TEMPLATES.retail.modules.every((moduleKey) =>
      professionalModules.includes(moduleKey),
    ),
    "PROFESSIONAL covers the retail template modules",
  );
  expect(
    INDUSTRY_TEMPLATES.agency.modules.every((moduleKey) =>
      businessModules.includes(moduleKey),
    ),
    "BUSINESS covers the agency template modules",
  );
  expect(
    INDUSTRY_TEMPLATES.education.modules.every((moduleKey) =>
      trialModules.includes(moduleKey),
    ),
    "FREE_TRIAL covers the education template modules",
  );
  expect(
    !professionalModules.includes("students"),
    "PROFESSIONAL still gates education modules",
  );

  const seededOrgs = await systemDb.organization.findMany({
    where: { slug: { in: ["acme-bakery", "globex-corp", "vertex-studio"] } },
    select: { slug: true, templateKey: true, id: true },
  });
  const expectedTemplates: Record<string, string> = {
    "acme-bakery": "retail",
    "globex-corp": "agency",
    "vertex-studio": "education",
  };
  for (const org of seededOrgs) {
    expect(
      org.templateKey === expectedTemplates[org.slug],
      `${org.slug} carries the ${expectedTemplates[org.slug]} template`,
    );
    const enabledRows = await systemDb.organizationModule.findMany({
      where: { organizationId: org.id, enabled: true },
      include: { module: { select: { key: true, isCore: true } } },
    });
    const enabledNonCore = enabledRows
      .filter((row) => !row.module.isCore)
      .map((row) => row.module.key)
      .sort();
    const expectedModules = [
      ...INDUSTRY_TEMPLATES[
        expectedTemplates[org.slug] as keyof typeof INDUSTRY_TEMPLATES
      ].modules,
    ].sort();
    expect(
      enabledNonCore.join(",") === expectedModules.join(","),
      `${org.slug} enables exactly its template modules`,
    );
    const customRoles = await systemDb.role.findMany({
      where: { organizationId: org.id, isSystem: false },
      include: { _count: { select: { rolePermissions: true } } },
    });
    expect(
      customRoles.length === 1 && customRoles[0]._count.rolePermissions > 0,
      `${org.slug} seeds its template custom role with permissions`,
    );
  }
  expect(seededOrgs.length === 3, "all three seeded organizations resolve");

  const permissionCount = await systemDb.permission.count({
    where: {
      key: {
        in: [
          PERMISSIONS.PRODUCTS_READ,
          PERMISSIONS.INVENTORY_READ,
          PERMISSIONS.ORDERS_READ,
          PERMISSIONS.SUPPLIERS_READ,
          PERMISSIONS.STUDENTS_READ,
          PERMISSIONS.COURSES_READ,
        ],
      },
    },
  });
  expect(permissionCount === 6, "new industry permissions are seeded");

  const superUser = await systemDb.user.findUnique({
    where: { email: "super@platform.test" },
  });
  expect(superUser !== null, "super admin exists for template creation");
  if (!superUser) {
    return;
  }
  const actor = { userId: superUser.id };
  const orgCountBefore = await systemDb.organization.count({
    where: { isPlatform: false },
  });

  const badTemplate = await createOrganization(actor, {
    name: "Bad Template Co",
    slug: "bad-template-co",
    businessType: "test",
    templateKey: "bogus",
    ownerName: "Owner",
    ownerEmail: "template-bad-owner@sa.test",
  });
  expect(
    badTemplate.ok === false &&
      badTemplate.errorKey === SUPER_ADMIN_ERRORS.invalidTemplate,
    "createOrganization rejects an unknown template",
  );

  const created = await createOrganization(actor, {
    name: "Edu Template Co",
    slug: "edu-template-co",
    businessType: "testing",
    templateKey: "education",
    ownerName: "Edu Owner",
    ownerEmail: "edu-owner@sa.test",
  });
  expect(created.ok === true && created.id, "createOrganization applies a template");
  const createdId = created.id!;

  const createdDetail = await getOrganizationDetail(createdId);
  expect(
    createdDetail?.templateKey === "education",
    "created organization stores the education template",
  );
  expect(
    createdDetail?.modules.find((m) => m.key === "students")?.enabled === true,
    "created organization enables template modules",
  );
  expect(
    createdDetail?.modules.find((m) => m.key === "sales")?.enabled === false,
    "created organization leaves non-template modules disabled",
  );
  const instructorRole = await systemDb.role.findFirst({
    where: { organizationId: createdId, key: "instructor" },
  });
  expect(
    instructorRole !== null,
    "created organization seeds the template custom role",
  );
  const createdAudit = await systemDb.platformAuditLog.findFirst({
    where: {
      organizationId: createdId,
      action: "organization.created",
      metadata: { path: ["template"], equals: "education" },
    },
  });
  expect(createdAudit !== null, "creation audit records the template");

  await systemDb.organization.delete({ where: { id: createdId } });
  await systemDb.user.deleteMany({
    where: { email: "edu-owner@sa.test" },
  });
  const orgCountAfter = await systemDb.organization.count({
    where: { isPlatform: false },
  });
  expect(
    orgCountAfter === orgCountBefore,
    "cleanup restores the organization count",
  );

  console.log("PASS: all industry template checks passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
