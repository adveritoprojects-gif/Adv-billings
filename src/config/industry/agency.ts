import { PERMISSIONS } from "@/server/auth/permissions";

import type { IndustryTemplate } from "./types";

export const agencyTemplate: IndustryTemplate = {
  key: "agency",
  modules: ["crm", "projects", "tasks", "finance", "reports"],
  nav: [
    { key: "dashboard" },
    { key: "crm", children: ["overview", "leads", "customers"] },
    { key: "projects" },
    { key: "tasks" },
    { key: "finance", children: ["invoices", "expenses"] },
    { key: "reports" },
    { key: "settings" },
  ],
  widgets: [
    { key: "metrics" },
    { key: "revenue-chart" },
    { key: "recent-leads", module: "crm" },
    { key: "recent-tasks", module: "tasks" },
  ],
  terms: {
    customers: "Clients",
  },
  customRoles: [
    {
      key: "account-manager",
      name: "Account Manager",
      description: "Runs client accounts, projects and billing",
      permissions: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.CRM_READ,
        PERMISSIONS.LEADS_READ,
        PERMISSIONS.CONTACTS_READ,
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.CUSTOMERS_MANAGE,
        PERMISSIONS.PROJECTS_READ,
        PERMISSIONS.TASKS_READ,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.INVOICES_READ,
        PERMISSIONS.EXPENSES_READ,
        PERMISSIONS.REPORTS_READ,
      ],
    },
  ],
};
