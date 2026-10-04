import type { PermissionKey, SystemRoleKey } from "@/server/auth/permissions";

import { agencyTemplate } from "./agency";
import { educationTemplate } from "./education";
import { generalTemplate } from "./general";
import { restaurantTemplate } from "./restaurant";
import { retailTemplate } from "./retail";
import { serviceTemplate } from "./service";
import type {
  DashboardWidgetKey,
  IndustryTemplate,
  IndustryTemplateKey,
} from "./types";

export type {
  DashboardWidgetKey,
  IndustryTemplate,
  IndustryTemplateKey,
  TemplateCustomRole,
  TemplateNavEntry,
  TemplateWidget,
} from "./types";

export const INDUSTRY_TEMPLATES: Record<IndustryTemplateKey, IndustryTemplate> =
  {
    general: generalTemplate,
    agency: agencyTemplate,
    retail: retailTemplate,
    restaurant: restaurantTemplate,
    service: serviceTemplate,
    education: educationTemplate,
  };

export const INDUSTRY_TEMPLATE_KEYS = Object.keys(
  INDUSTRY_TEMPLATES,
) as IndustryTemplateKey[];

export const DASHBOARD_WIDGET_KEYS: DashboardWidgetKey[] = [
  "metrics",
  "revenue-chart",
  "recent-leads",
  "recent-orders",
  "top-products",
  "low-stock",
  "recent-tasks",
  "recent-students",
];

export const DEFAULT_INDUSTRY_TEMPLATE: IndustryTemplateKey = "general";

export function isIndustryTemplateKey(
  value: unknown,
): value is IndustryTemplateKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(INDUSTRY_TEMPLATES, value)
  );
}

export function getIndustryTemplate(key?: string | null): IndustryTemplate {
  if (isIndustryTemplateKey(key)) {
    return INDUSTRY_TEMPLATES[key];
  }
  return INDUSTRY_TEMPLATES[DEFAULT_INDUSTRY_TEMPLATE];
}

export function getTemplateTerm(
  templateKey: string | null | undefined,
  termKey: string,
): string | undefined {
  return getIndustryTemplate(templateKey).terms?.[termKey];
}

export function getTemplatePermissionExtras(
  templateKey: string | null | undefined,
  roleKey: string,
): PermissionKey[] {
  const extras =
    getIndustryTemplate(templateKey).rolePermissionExtras?.[
      roleKey as SystemRoleKey
    ];
  return extras ? [...extras] : [];
}

interface NavNode {
  key: string;
  templateOnly?: boolean;
  subItems?: readonly { key: string }[] | undefined;
}

export interface TemplateNavOptions<
  T extends NavNode,
  C extends { key: string } = { key: string },
> {
  isItemVisible?: (item: T) => boolean;
  isChildVisible?: (child: C) => boolean;
}

function gateChildren<T extends NavNode, C extends { key: string }>(
  item: T,
  options: TemplateNavOptions<T, C>,
): T | null {
  if (!item.subItems || item.subItems.length === 0) {
    return item;
  }
  const isChildVisible = options.isChildVisible;
  const children = isChildVisible
    ? item.subItems.filter((child) => isChildVisible(child as C))
    : [...item.subItems];
  if (children.length === 0) {
    return null;
  }
  return { ...item, subItems: children } as T;
}

export function applyTemplateNav<
  T extends NavNode,
  C extends { key: string } = { key: string },
>(
  items: readonly T[],
  template: IndustryTemplate,
  options: TemplateNavOptions<T, C> = {},
): T[] {
  const isItemVisible = options.isItemVisible ?? (() => true);
  const isChildVisible = options.isChildVisible;
  const byKey = new Map(items.map((item) => [item.key, item]));
  const listedKeys = new Set(template.nav.map((entry) => entry.key));
  const ordered: T[] = [];

  for (const entry of template.nav) {
    const item = byKey.get(entry.key);
    if (!item || !isItemVisible(item)) {
      continue;
    }
    if (entry.children && item.subItems && item.subItems.length > 0) {
      const childByKey = new Map(
        item.subItems.map((child) => [child.key, child]),
      );
      const children = entry.children
        .map((childKey) => childByKey.get(childKey))
        .filter((child): child is { key: string } => Boolean(child))
        .filter((child) =>
          isChildVisible ? isChildVisible(child as C) : true,
        );
      if (children.length === 0) {
        continue;
      }
      ordered.push({ ...item, subItems: children } as T);
      continue;
    }
    const gated = gateChildren<T, C>(item, options);
    if (gated) {
      ordered.push(gated);
    }
  }

  const appended: T[] = [];
  for (const item of items) {
    if (listedKeys.has(item.key) || item.templateOnly) {
      continue;
    }
    if (!isItemVisible(item)) {
      continue;
    }
    const gated = gateChildren<T, C>(item, options);
    if (gated) {
      appended.push(gated);
    }
  }

  const settingsIndex = ordered.findIndex((item) => item.key === "settings");
  const settingsItem =
    settingsIndex >= 0 ? ordered.splice(settingsIndex, 1)[0] : undefined;
  const result = [...ordered, ...appended];
  if (settingsItem) {
    result.push(settingsItem);
  }
  return result;
}

export function getTemplateWidgetKeys(
  template: IndustryTemplate,
): DashboardWidgetKey[] {
  return template.widgets.map((widget) => widget.key);
}
