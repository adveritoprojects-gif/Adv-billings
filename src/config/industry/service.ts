import { PERMISSIONS } from "@/server/auth/permissions";

import type { IndustryTemplate } from "./types";

export const serviceTemplate: IndustryTemplate = {
  key: "service",
  modules: ["crm", "projects", "tasks", "finance", "reports"],
  nav: [
    { key: "dashboard" },
    { key: "crm", children: ["overview", "leads", "contacts", "customers"] },
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
  customRoles: [
    {
      key: "consultant",
      name: "Consultant",
      description: "Delivers client work with leads, projects and tasks",
      permissions: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.CRM_READ,
        PERMISSIONS.LEADS_READ,
        PERMISSIONS.LEADS_MANAGE,
        PERMISSIONS.CONTACTS_READ,
        PERMISSIONS.CONTACTS_MANAGE,
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.PROJECTS_READ,
        PERMISSIONS.TASKS_READ,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.INVOICES_READ,
      ],
    },
  ],
};
