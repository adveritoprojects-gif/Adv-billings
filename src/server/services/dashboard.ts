import { CrmLeadStatus, CrmTaskStatus } from "@prisma/client";

import { db, withTenant } from "@/server/db";

import type {
  LeadRow,
  RevenueSeries,
  SaasMetric,
  TaskRow,
  TaskStatusKey,
} from "@/components/dashboard/types";
import { formatDate } from "@/components/crm/format";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return formatNumber(value);
  }
}

function percentChange(current: number, previous: number): number | undefined {
  if (previous <= 0) {
    return undefined;
  }
  return ((current - previous) / previous) * 100;
}

function metric(
  key: SaasMetric["key"],
  value: string,
  delta?: number,
): SaasMetric {
  if (delta === undefined) {
    return { key, value };
  }
  return { key, value, delta, trend: delta >= 0 ? "up" : "down" };
}

function monthStart(offset: number, now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
  );
}

export async function getSaasMetrics(
  organizationId: string,
  currency: string,
): Promise<SaasMetric[]> {
  return withTenant(organizationId, async () => {
    const now = new Date();
    const thisMonth = monthStart(0, now);
    const lastMonth = monthStart(-1, now);

    const [
      totalLeads,
      leadsBeforeMonth,
      newLeadsThis,
      newLeadsLast,
      totalCustomers,
      customersThis,
      customersLast,
      activeDeals,
      pendingTasks,
      wonCount,
      lostCount,
      wonCountThis,
      lostCountThis,
      wonCountLast,
      lostCountLast,
      revenueAll,
      revenueThis,
      revenueLast,
    ] = await Promise.all([
      db.crmLead.count(),
      db.crmLead.count({ where: { createdAt: { lt: thisMonth } } }),
      db.crmLead.count({ where: { createdAt: { gte: thisMonth } } }),
      db.crmLead.count({
        where: { createdAt: { gte: lastMonth, lt: thisMonth } },
      }),
      db.crmCustomer.count(),
      db.crmCustomer.count({ where: { createdAt: { gte: thisMonth } } }),
      db.crmCustomer.count({
        where: { createdAt: { gte: lastMonth, lt: thisMonth } },
      }),
      db.crmLead.count({
        where: { status: { in: [CrmLeadStatus.QUALIFIED, CrmLeadStatus.PROPOSAL] } },
      }),
      db.crmTask.count({
        where: {
          status: {
            in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS, CrmTaskStatus.BLOCKED],
          },
        },
      }),
      db.crmLead.count({ where: { status: CrmLeadStatus.WON } }),
      db.crmLead.count({ where: { status: CrmLeadStatus.LOST } }),
      db.crmLead.count({
        where: { status: CrmLeadStatus.WON, createdAt: { gte: thisMonth } },
      }),
      db.crmLead.count({
        where: { status: CrmLeadStatus.LOST, createdAt: { gte: thisMonth } },
      }),
      db.crmLead.count({
        where: {
          status: CrmLeadStatus.WON,
          createdAt: { gte: lastMonth, lt: thisMonth },
        },
      }),
      db.crmLead.count({
        where: {
          status: CrmLeadStatus.LOST,
          createdAt: { gte: lastMonth, lt: thisMonth },
        },
      }),
      db.crmLead.aggregate({
        where: { status: CrmLeadStatus.WON },
        _sum: { valueCents: true },
      }),
      db.crmLead.aggregate({
        where: { status: CrmLeadStatus.WON, createdAt: { gte: thisMonth } },
        _sum: { valueCents: true },
      }),
      db.crmLead.aggregate({
        where: {
          status: CrmLeadStatus.WON,
          createdAt: { gte: lastMonth, lt: thisMonth },
        },
        _sum: { valueCents: true },
      }),
    ]);

    const conversionRate =
      wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;
    const conversionThis =
      wonCountThis + lostCountThis > 0
        ? (wonCountThis / (wonCountThis + lostCountThis)) * 100
        : undefined;
    const conversionLast =
      wonCountLast + lostCountLast > 0
        ? (wonCountLast / (wonCountLast + lostCountLast)) * 100
        : undefined;
    const conversionDelta =
      conversionThis !== undefined && conversionLast !== undefined
        ? conversionThis - conversionLast
        : undefined;

    const revenueAllCents = revenueAll._sum.valueCents ?? 0;
    const revenueThisCents = revenueThis._sum.valueCents ?? 0;
    const revenueLastCents = revenueLast._sum.valueCents ?? 0;

    return [
      metric(
        "totalLeads",
        formatNumber(totalLeads),
        percentChange(totalLeads, leadsBeforeMonth),
      ),
      metric(
        "newLeads",
        formatNumber(newLeadsThis),
        percentChange(newLeadsThis, newLeadsLast),
      ),
      metric(
        "customers",
        formatNumber(totalCustomers),
        percentChange(customersThis, customersLast),
      ),
      metric("activeDeals", formatNumber(activeDeals)),
      metric(
        "revenue",
        formatCurrency(revenueAllCents / 100, currency),
        percentChange(revenueThisCents, revenueLastCents),
      ),
      metric("pendingTasks", formatNumber(pendingTasks)),
      metric(
        "conversionRate",
        `${conversionRate.toFixed(1)}%`,
        conversionDelta,
      ),
    ];
  });
}

function mapTaskStatus(status: CrmTaskStatus): TaskStatusKey {
  switch (status) {
    case CrmTaskStatus.OPEN:
      return "open";
    case CrmTaskStatus.IN_PROGRESS:
      return "progress";
    case CrmTaskStatus.BLOCKED:
      return "blocked";
    case CrmTaskStatus.DONE:
      return "done";
    case CrmTaskStatus.CANCELED:
      return "canceled";
    default:
      return "open";
  }
}

export async function getRecentLeadRows(
  organizationId: string,
  currency: string,
  limit = 5,
): Promise<LeadRow[]> {
  return withTenant(organizationId, async () => {
    const leads = await db.crmLead.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        company: true,
        source: true,
        status: true,
        valueCents: true,
      },
    });
    return leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      company: lead.company ?? "—",
      source: lead.source,
      status: lead.status,
      value:
        lead.valueCents === null
          ? "—"
          : formatCurrency(lead.valueCents / 100, currency),
    }));
  });
}

export async function getRecentTaskRows(
  organizationId: string,
  limit = 6,
): Promise<TaskRow[]> {
  return withTenant(organizationId, async () => {
    const tasks = await db.crmTask.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        dueAt: true,
        status: true,
        lead: { select: { name: true } },
      },
    });
    return tasks.map((task) => ({
      id: task.id,
      task: task.title,
      project: task.lead?.name ?? "—",
      due: formatDate(task.dueAt ? task.dueAt.toISOString() : null),
      status: mapTaskStatus(task.status),
    }));
  });
}

export async function getRevenueSeries(
  organizationId: string,
): Promise<RevenueSeries> {
  return withTenant(organizationId, async () => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const leads = await db.crmLead.findMany({
      where: { status: CrmLeadStatus.WON, createdAt: { gte: start } },
      select: { createdAt: true, valueCents: true },
    });

    const thisYear = new Array(12).fill(0) as number[];
    const lastYear = new Array(12).fill(0) as number[];
    const currentYear = now.getUTCFullYear();

    for (const lead of leads) {
      const year = lead.createdAt.getUTCFullYear();
      const month = lead.createdAt.getUTCMonth();
      const amount = (lead.valueCents ?? 0) / 100;
      if (year === currentYear) {
        thisYear[month] += amount;
      } else if (year === currentYear - 1) {
        lastYear[month] += amount;
      }
    }

    return { thisYear, lastYear };
  });
}
