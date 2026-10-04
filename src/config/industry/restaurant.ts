import { PERMISSIONS } from "@/server/auth/permissions";

import type { IndustryTemplate } from "./types";

export const restaurantTemplate: IndustryTemplate = {
  key: "restaurant",
  modules: ["crm", "products", "orders", "finance", "reports"],
  nav: [
    { key: "dashboard" },
    { key: "orders" },
    { key: "products" },
    { key: "crm", children: ["customers"] },
    { key: "staff" },
    { key: "finance", children: ["expenses"] },
    { key: "reports" },
    { key: "settings" },
  ],
  widgets: [
    { key: "metrics" },
    { key: "recent-orders", module: "orders" },
    { key: "top-products", module: "products" },
    { key: "revenue-chart" },
  ],
  terms: {
    products: "Menu",
    "top-products": "Popular Items",
  },
  customRoles: [
    {
      key: "shift-lead",
      name: "Shift Lead",
      description: "Handles daily orders, menu and guest requests",
      permissions: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.PRODUCTS_READ,
        PERMISSIONS.CRM_READ,
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.TASKS_READ,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.EXPENSES_READ,
      ],
    },
  ],
  rolePermissionExtras: {
    manager: [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.ORDERS_READ],
    staff: [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.ORDERS_READ],
    viewer: [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.ORDERS_READ],
  },
};
