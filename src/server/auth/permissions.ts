export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  ANALYTICS_READ: "analytics.read",
  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_UPDATE: "organization.update",
  MEMBERS_READ: "members.read",
  MEMBERS_MANAGE: "members.manage",
  ROLES_READ: "roles.read",
  ROLES_MANAGE: "roles.manage",
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",
  MODULES_READ: "modules.read",
  MODULES_MANAGE: "modules.manage",
  SUBSCRIPTION_READ: "subscription.read",
  BILLING_MANAGE: "billing.manage",
  ACTIVITY_READ: "activity.read",
  CRM_READ: "crm.read",
  LEADS_READ: "leads.read",
  CONTACTS_READ: "contacts.read",
  CUSTOMERS_READ: "customers.read",
  COMPANIES_READ: "companies.read",
  ACTIVITIES_READ: "activities.read",
  LEADS_MANAGE: "leads.manage",
  CONTACTS_MANAGE: "contacts.manage",
  COMPANIES_MANAGE: "companies.manage",
  CUSTOMERS_MANAGE: "customers.manage",
  TASKS_MANAGE: "tasks.manage",
  SALES_READ: "sales.read",
  DEALS_READ: "deals.read",
  TASKS_READ: "tasks.read",
  PROJECTS_READ: "projects.read",
  FINANCE_READ: "finance.read",
  INVOICES_READ: "invoices.read",
  EXPENSES_READ: "expenses.read",
  REPORTS_READ: "reports.read",
  PRODUCTS_READ: "products.read",
  INVENTORY_READ: "inventory.read",
  ORDERS_READ: "orders.read",
  SUPPLIERS_READ: "suppliers.read",
  STUDENTS_READ: "students.read",
  COURSES_READ: "courses.read",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  VIEWER: "viewer",
} as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export interface PermissionCatalogEntry {
  key: PermissionKey;
  name: string;
  description: string;
  group: string;
}

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  {
    key: PERMISSIONS.DASHBOARD_READ,
    name: "View dashboard",
    description: "Access the main dashboard",
    group: "dashboard",
  },
  {
    key: PERMISSIONS.ANALYTICS_READ,
    name: "View analytics",
    description: "Access charts and analytics",
    group: "dashboard",
  },
  {
    key: PERMISSIONS.ORGANIZATION_READ,
    name: "View organization",
    description: "View organization profile",
    group: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_UPDATE,
    name: "Manage organization",
    description: "Edit organization profile and branding",
    group: "organization",
  },
  {
    key: PERMISSIONS.MEMBERS_READ,
    name: "View members",
    description: "See organization members",
    group: "members",
  },
  {
    key: PERMISSIONS.MEMBERS_MANAGE,
    name: "Manage members",
    description: "Invite, update and remove members",
    group: "members",
  },
  {
    key: PERMISSIONS.ROLES_READ,
    name: "View roles",
    description: "See roles and their permissions",
    group: "roles",
  },
  {
    key: PERMISSIONS.ROLES_MANAGE,
    name: "Manage roles",
    description: "Create and update custom roles",
    group: "roles",
  },
  {
    key: PERMISSIONS.SETTINGS_READ,
    name: "View settings",
    description: "View organization settings",
    group: "settings",
  },
  {
    key: PERMISSIONS.SETTINGS_UPDATE,
    name: "Manage settings",
    description: "Update organization settings",
    group: "settings",
  },
  {
    key: PERMISSIONS.MODULES_READ,
    name: "View modules",
    description: "See enabled modules",
    group: "modules",
  },
  {
    key: PERMISSIONS.MODULES_MANAGE,
    name: "Manage modules",
    description: "Enable and disable modules",
    group: "modules",
  },
  {
    key: PERMISSIONS.SUBSCRIPTION_READ,
    name: "View subscription",
    description: "See plan and subscription status",
    group: "subscription",
  },
  {
    key: PERMISSIONS.BILLING_MANAGE,
    name: "Manage billing",
    description: "Switch plans and manage the subscription",
    group: "subscription",
  },
  {
    key: PERMISSIONS.ACTIVITY_READ,
    name: "View activity log",
    description: "See organization activity history",
    group: "activity",
  },
  {
    key: PERMISSIONS.CRM_READ,
    name: "View CRM",
    description: "Access the CRM module",
    group: "crm",
  },
  {
    key: PERMISSIONS.LEADS_READ,
    name: "View leads",
    description: "See leads in the pipeline",
    group: "crm",
  },
  {
    key: PERMISSIONS.CONTACTS_READ,
    name: "View contacts",
    description: "See CRM contacts",
    group: "crm",
  },
  {
    key: PERMISSIONS.CUSTOMERS_READ,
    name: "View customers",
    description: "See customer records",
    group: "crm",
  },
  {
    key: PERMISSIONS.COMPANIES_READ,
    name: "View companies",
    description: "See company records",
    group: "crm",
  },
  {
    key: PERMISSIONS.ACTIVITIES_READ,
    name: "View activities",
    description: "See CRM activity history",
    group: "crm",
  },
  {
    key: PERMISSIONS.LEADS_MANAGE,
    name: "Manage leads",
    description: "Create, edit, assign and delete leads",
    group: "crm",
  },
  {
    key: PERMISSIONS.CONTACTS_MANAGE,
    name: "Manage contacts",
    description: "Create, edit and delete contacts",
    group: "crm",
  },
  {
    key: PERMISSIONS.COMPANIES_MANAGE,
    name: "Manage companies",
    description: "Create, edit and delete companies",
    group: "crm",
  },
  {
    key: PERMISSIONS.CUSTOMERS_MANAGE,
    name: "Manage customers",
    description: "Create, edit and delete customers",
    group: "crm",
  },
  {
    key: PERMISSIONS.TASKS_MANAGE,
    name: "Manage tasks",
    description: "Create, edit and complete CRM tasks",
    group: "crm",
  },
  {
    key: PERMISSIONS.SALES_READ,
    name: "View sales",
    description: "Access the sales module",
    group: "sales",
  },
  {
    key: PERMISSIONS.DEALS_READ,
    name: "View deals",
    description: "See deals in the pipeline",
    group: "sales",
  },
  {
    key: PERMISSIONS.TASKS_READ,
    name: "View tasks",
    description: "See team tasks",
    group: "tasks",
  },
  {
    key: PERMISSIONS.PROJECTS_READ,
    name: "View projects",
    description: "See projects",
    group: "projects",
  },
  {
    key: PERMISSIONS.FINANCE_READ,
    name: "View finance",
    description: "Access the finance module",
    group: "finance",
  },
  {
    key: PERMISSIONS.INVOICES_READ,
    name: "View invoices",
    description: "See invoices",
    group: "finance",
  },
  {
    key: PERMISSIONS.EXPENSES_READ,
    name: "View expenses",
    description: "See expenses",
    group: "finance",
  },
  {
    key: PERMISSIONS.REPORTS_READ,
    name: "View reports",
    description: "Access reports",
    group: "reports",
  },
  {
    key: PERMISSIONS.PRODUCTS_READ,
    name: "View products",
    description: "See products and catalog",
    group: "catalog",
  },
  {
    key: PERMISSIONS.INVENTORY_READ,
    name: "View inventory",
    description: "See stock levels",
    group: "catalog",
  },
  {
    key: PERMISSIONS.ORDERS_READ,
    name: "View orders",
    description: "See orders",
    group: "catalog",
  },
  {
    key: PERMISSIONS.SUPPLIERS_READ,
    name: "View suppliers",
    description: "See suppliers",
    group: "catalog",
  },
  {
    key: PERMISSIONS.STUDENTS_READ,
    name: "View students",
    description: "See students",
    group: "education",
  },
  {
    key: PERMISSIONS.COURSES_READ,
    name: "View courses",
    description: "See courses",
    group: "education",
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map(
  (entry) => entry.key,
);

const READ_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.ORGANIZATION_READ,
  PERMISSIONS.SETTINGS_READ,
  PERMISSIONS.MODULES_READ,
  PERMISSIONS.SUBSCRIPTION_READ,
  PERMISSIONS.ACTIVITY_READ,
  PERMISSIONS.CRM_READ,
  PERMISSIONS.LEADS_READ,
  PERMISSIONS.CONTACTS_READ,
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.COMPANIES_READ,
  PERMISSIONS.ACTIVITIES_READ,
  PERMISSIONS.SALES_READ,
  PERMISSIONS.DEALS_READ,
  PERMISSIONS.TASKS_READ,
  PERMISSIONS.PROJECTS_READ,
  PERMISSIONS.REPORTS_READ,
];

const FINANCE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.FINANCE_READ,
  PERMISSIONS.INVOICES_READ,
  PERMISSIONS.EXPENSES_READ,
];

export const ROLE_PERMISSIONS: Record<SystemRoleKey, PermissionKey[]> = {
  super_admin: [...ALL_PERMISSION_KEYS],
  owner: [...ALL_PERMISSION_KEYS],
  admin: [...ALL_PERMISSION_KEYS],
  manager: [
    ...READ_PERMISSIONS,
    ...FINANCE_PERMISSIONS,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.MODULES_MANAGE,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.CONTACTS_MANAGE,
    PERMISSIONS.COMPANIES_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ],
  staff: [
    ...READ_PERMISSIONS,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.CONTACTS_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ],
  viewer: [...READ_PERMISSIONS],
};

export const SYSTEM_ROLE_LABELS: Record<SystemRoleKey, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer",
};

export function isSuperAdmin(roleKey: string): boolean {
  return roleKey === SYSTEM_ROLES.SUPER_ADMIN;
}

export function hasPermission(
  roleKey: string,
  granted: readonly string[],
  permission: PermissionKey,
): boolean {
  if (isSuperAdmin(roleKey)) {
    return true;
  }
  return granted.includes(permission);
}

export function withTemplatePermissionExtras(
  granted: readonly PermissionKey[],
  extras: readonly PermissionKey[] | undefined,
): PermissionKey[] {
  if (!extras || extras.length === 0) {
    return [...granted];
  }
  return [...new Set([...granted, ...extras])];
}
