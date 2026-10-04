import { PERMISSIONS } from "@/server/auth/permissions";

import type { IndustryTemplate } from "./types";

export const retailTemplate: IndustryTemplate = {
  key: "retail",
  modules: [
    "crm",
    "products",
    "inventory",
    "orders",
    "suppliers",
    "finance",
    "reports",
  ],
  nav: [
    { key: "dashboard" },
    { key: "products" },
    { key: "inventory" },
    { key: "orders" },
    { key: "crm", children: ["customers"] },
    { key: "suppliers" },
    { key: "finance", children: ["expenses"] },
    { key: "reports" },
    { key: "settings" },
  ],
  widgets: [
    { key: "metrics" },
    { key: "revenue-chart" },
    { key: "top-products", module: "products" },
    { key: "low-stock", module: "inventory" },
    { key: "recent-orders", module: "orders" },
  ],
  customRoles: [
    {
      key: "store-manager",
      name: "Store Manager",
      description: "Manages products, stock, orders and suppliers",
      permissions: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.CRM_READ,
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.PRODUCTS_READ,
        PERMISSIONS.INVENTORY_READ,
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.SUPPLIERS_READ,
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.EXPENSES_READ,
        PERMISSIONS.REPORTS_READ,
      ],
    },
  ],
  rolePermissionExtras: {
    manager: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.SUPPLIERS_READ,
    ],
    staff: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.SUPPLIERS_READ,
    ],
    viewer: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.SUPPLIERS_READ,
    ],
  },
};
