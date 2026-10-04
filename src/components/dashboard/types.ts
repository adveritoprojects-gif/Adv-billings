import type { CrmLeadStatus } from "@prisma/client";

export type MetricKey =
  | "totalLeads"
  | "newLeads"
  | "customers"
  | "activeDeals"
  | "revenue"
  | "pendingTasks"
  | "conversionRate";

export interface SaasMetric {
  key: MetricKey;
  value: string;
  delta?: number;
  trend?: "up" | "down";
}

export interface LeadRow {
  id: string;
  name: string;
  company: string;
  source: string;
  status: CrmLeadStatus;
  value: string;
}

export type TaskStatusKey = "open" | "progress" | "blocked" | "done" | "canceled";

export interface TaskRow {
  id: string;
  task: string;
  project: string;
  due: string;
  status: TaskStatusKey;
}

export interface RevenueSeries {
  thisYear: number[];
  lastYear: number[];
}
