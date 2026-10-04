import type {
  PlanInterval,
  PlanKey,
  SubscriptionEventType,
  SubscriptionState,
  UsageMetric,
} from "@prisma/client";

export interface PlanLimits {
  maxUsers: number | null;
  maxLeads: number | null;
  maxCustomers: number | null;
  maxProjects: number | null;
  maxStorage: number | null;
  enabledModules: string[] | null;
}

export type LimitKey =
  | "maxUsers"
  | "maxLeads"
  | "maxCustomers"
  | "maxProjects"
  | "maxStorage";

export type SubscriptionAccess = "full" | "readonly" | "none";

export interface BillingContext {
  organization: { id: string };
  role?: { key: string } | null;
  modules?: string[];
  subscription?: SubscriptionInfo | null;
}

export interface SubscriptionPlanInfo {
  id: string;
  key: PlanKey;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: PlanInterval;
  trialDays: number;
  limits: PlanLimits;
}

export interface SubscriptionInfo {
  id: string;
  state: SubscriptionState;
  plan: SubscriptionPlanInfo;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  endedAt: Date | null;
}

export interface SubscriptionCheck {
  access: SubscriptionAccess;
  subscription: SubscriptionInfo | null;
  errorKey: string | null;
}

export type PlanLimitCheck =
  | { ok: true; used: number; limit: number | null; errorKey: null }
  | { ok: false; used: number; limit: number | null; errorKey: string };

export interface UsageSnapshot {
  metric: UsageMetric;
  used: number;
  limit: number | null;
}

export interface SubscriptionEventInfo {
  id: string;
  type: SubscriptionEventType;
  fromState: SubscriptionState | null;
  toState: SubscriptionState | null;
  planKey: PlanKey | null;
  createdAt: Date;
}

function readLimitValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return null;
}

function readModuleKeys(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const keys = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
  return keys.length > 0 ? keys : null;
}

export function parsePlanLimits(raw: unknown): PlanLimits {
  const source = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as Record<string, unknown>;
  return {
    maxUsers: readLimitValue(source.maxUsers),
    maxLeads: readLimitValue(source.maxLeads),
    maxCustomers: readLimitValue(source.maxCustomers),
    maxProjects: readLimitValue(source.maxProjects),
    maxStorage: readLimitValue(source.maxStorage),
    enabledModules: readModuleKeys(source.enabledModules),
  };
}
