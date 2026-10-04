export type SuperAdminBadgeColor =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "light"
  | "dark";

const ORG_STATUS_COLORS: Record<string, SuperAdminBadgeColor> = {
  ACTIVE: "success",
  TRIAL: "info",
  SUSPENDED: "error",
  ARCHIVED: "light",
};

const MEMBER_STATUS_COLORS: Record<string, SuperAdminBadgeColor> = {
  ACTIVE: "success",
  INVITED: "warning",
  SUSPENDED: "error",
};

export function orgStatusColor(status: string): SuperAdminBadgeColor {
  return ORG_STATUS_COLORS[status] ?? "light";
}

export function memberStatusColor(status: string): SuperAdminBadgeColor {
  return MEMBER_STATUS_COLORS[status] ?? "light";
}

export const AUDIT_ACTION_KEYS: Record<string, string> = {
  "organization.created": "organizationCreated",
  "organization.updated": "organizationUpdated",
  "organization.brandingUpdated": "organizationBrandingUpdated",
  "organization.suspended": "organizationSuspended",
  "organization.activated": "organizationActivated",
  "subscription.planAssigned": "planAssigned",
  "subscription.planChanged": "planChanged",
  "subscription.trialStarted": "trialStarted",
  "subscription.trialExtended": "trialExtended",
  "subscription.suspended": "subscriptionSuspended",
  "subscription.reactivated": "subscriptionReactivated",
  "module.enabled": "moduleEnabled",
  "module.disabled": "moduleDisabled",
  "member.added": "memberAdded",
  "member.roleChanged": "memberRoleChanged",
  "member.removed": "memberRemoved",
};

export function auditMessageKey(action: string): string | null {
  return AUDIT_ACTION_KEYS[action] ?? null;
}

export function auditParams(
  metadata: unknown,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (typeof metadata !== "object" || metadata === null) {
    return params;
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string" || typeof value === "number") {
      params[key] = value;
    }
  }
  return params;
}
