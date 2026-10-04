import type { PermissionKey, SystemRoleKey } from "@/server/auth/permissions";

export type IndustryTemplateKey =
  | "general"
  | "agency"
  | "retail"
  | "restaurant"
  | "service"
  | "education";

export type DashboardWidgetKey =
  | "metrics"
  | "revenue-chart"
  | "recent-leads"
  | "recent-orders"
  | "top-products"
  | "low-stock"
  | "recent-tasks"
  | "recent-students";

export interface TemplateNavEntry {
  key: string;
  children?: string[];
}

export interface TemplateWidget {
  key: DashboardWidgetKey;
  module?: string;
}

export interface TemplateCustomRole {
  key: string;
  name: string;
  description?: string;
  permissions: PermissionKey[];
}

export interface IndustryTemplate {
  key: IndustryTemplateKey;
  modules: string[];
  nav: TemplateNavEntry[];
  widgets: TemplateWidget[];
  terms?: Record<string, string>;
  customRoles?: TemplateCustomRole[];
  rolePermissionExtras?: Partial<Record<SystemRoleKey, PermissionKey[]>>;
}
