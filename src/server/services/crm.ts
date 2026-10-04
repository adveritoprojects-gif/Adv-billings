import {
  CrmActivityType,
  CrmCustomerStatus,
  CrmLeadStatus,
  CrmTaskStatus,
  Prisma,
} from "@prisma/client";

import type { OrganizationContext } from "@/server/auth/guards";
import { db, orgScope } from "@/server/db";
import {
  CRM_PAGE_SIZE,
  type CrmActivityRow,
  type CrmCompanyRow,
  type CrmContactRow,
  type CrmCustomerRow,
  type CrmFollowUpDto,
  type CrmLeadDetail,
  type CrmLeadRow,
  type CrmListQuery,
  type CrmListResult,
  type CrmMember,
  type CrmNoteDto,
  type CrmOverview,
  type CrmSortDir,
  type CrmTaskRow,
} from "@/components/crm/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export function parseCrmListParams(sp: SearchParamsRecord): CrmListQuery {
  const pageRaw = Number.parseInt(first(sp.page), 10);
  const dir = first(sp.dir) === "asc" ? "asc" : ("desc" as CrmSortDir);
  return {
    q: first(sp.q).trim(),
    status: first(sp.status),
    assignedTo: first(sp.assignedTo),
    type: first(sp.type),
    sort: first(sp.sort),
    dir,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

function pageMeta(page: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / CRM_PAGE_SIZE));
  return {
    page: Math.min(Math.max(1, page), totalPages),
    totalPages,
    total,
  };
}

function orderBy<T extends string>(
  sort: string,
  dir: CrmSortDir,
  allowed: readonly T[],
  fallback: T,
): Record<T, CrmSortDir> {
  const field = (allowed as readonly string[]).includes(sort)
    ? (sort as T)
    : fallback;
  return { [field]: dir } as Record<T, CrmSortDir>;
}

export async function listMembers(
  ctx: OrganizationContext,
): Promise<CrmMember[]> {
  return orgScope(ctx, async () => {
    const rows = await db.organizationMember.findMany({
      where: { status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return rows.map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
    }));
  });
}

type MemberMap = Map<string, string>;

function memberMap(members: CrmMember[]): MemberMap {
  return new Map(members.map((m) => [m.id, m.name]));
}

function isOverdueTask(
  dueAt: Date | null,
  status: string,
): boolean {
  if (!dueAt || status === "DONE" || status === "CANCELED") {
    return false;
  }
  return dueAt.getTime() < Date.now();
}

function nameOf(map: MemberMap, id: string | null | undefined): string | null {
  if (!id) return null;
  return map.get(id) ?? null;
}

export async function listCompanyOptions(
  ctx: OrganizationContext,
): Promise<{ id: string; name: string }[]> {
  return orgScope(ctx, () =>
    db.crmCompany.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

export async function listLeadOptions(
  ctx: OrganizationContext,
): Promise<{ id: string; name: string }[]> {
  return orgScope(ctx, () =>
    db.crmLead.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

export async function listLeads(
  ctx: OrganizationContext,
  query: CrmListQuery,
  members: CrmMember[],
): Promise<CrmListResult<CrmLeadRow>> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const q = query.q;
    const where: Prisma.CrmLeadWhereInput = {
      ...(query.status && query.status in CrmLeadStatus
        ? { status: query.status as CrmLeadStatus }
        : {}),
      ...(query.assignedTo ? { assignedToId: query.assignedTo } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.crmLead.count({ where }),
      db.crmLead.findMany({
        where,
        orderBy: orderBy(
          query.sort,
          query.dir,
          ["createdAt", "updatedAt", "name", "company", "status", "priority"],
          "createdAt",
        ),
        skip: (query.page - 1) * CRM_PAGE_SIZE,
        take: CRM_PAGE_SIZE,
      }),
    ]);
    const meta = pageMeta(query.page, total);
    return {
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        source: row.source,
        status: row.status,
        priority: row.priority,
        assignedToId: row.assignedToId,
        assignedToName: nameOf(map, row.assignedToId),
        notes: row.notes,
        valueCents: row.valueCents,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  });
}

export async function listContacts(
  ctx: OrganizationContext,
  query: CrmListQuery,
  members: CrmMember[],
): Promise<CrmListResult<CrmContactRow>> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const q = query.q;
    const where: Prisma.CrmContactWhereInput = {
      ...(query.assignedTo ? { assignedToId: query.assignedTo } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { jobTitle: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows, companies] = await Promise.all([
      db.crmContact.count({ where }),
      db.crmContact.findMany({
        where,
        orderBy: orderBy(
          query.sort,
          query.dir,
          ["createdAt", "updatedAt", "name", "email"],
          "createdAt",
        ),
        skip: (query.page - 1) * CRM_PAGE_SIZE,
        take: CRM_PAGE_SIZE,
      }),
      db.crmCompany.findMany({ select: { id: true, name: true } }),
    ]);
    const companyNames = new Map(companies.map((c) => [c.id, c.name]));
    const meta = pageMeta(query.page, total);
    return {
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        jobTitle: row.jobTitle,
        companyId: row.companyId,
        companyName: row.companyId
          ? (companyNames.get(row.companyId) ?? null)
          : null,
        assignedToId: row.assignedToId,
        assignedToName: nameOf(map, row.assignedToId),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}

export async function listCompanies(
  ctx: OrganizationContext,
  query: CrmListQuery,
): Promise<CrmListResult<CrmCompanyRow>> {
  return orgScope(ctx, async () => {
    const q = query.q;
    const where: Prisma.CrmCompanyWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
              { website: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows, contactCounts] = await Promise.all([
      db.crmCompany.count({ where }),
      db.crmCompany.findMany({
        where,
        orderBy: orderBy(
          query.sort,
          query.dir,
          ["createdAt", "updatedAt", "name", "industry"],
          "createdAt",
        ),
        skip: (query.page - 1) * CRM_PAGE_SIZE,
        take: CRM_PAGE_SIZE,
      }),
      db.crmContact.groupBy({ by: ["companyId"], _count: { _all: true } }),
    ]);
    const counts = new Map(
      contactCounts.map((entry) => [entry.companyId, entry._count._all]),
    );
    const meta = pageMeta(query.page, total);
    return {
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        website: row.website,
        industry: row.industry,
        email: row.email,
        phone: row.phone,
        address: row.address,
        size: row.size,
        contactCount: counts.get(row.id) ?? 0,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}

export async function listCustomers(
  ctx: OrganizationContext,
  query: CrmListQuery,
  members: CrmMember[],
): Promise<CrmListResult<CrmCustomerRow>> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const q = query.q;
    const where: Prisma.CrmCustomerWhereInput = {
      ...(query.status && query.status in CrmCustomerStatus
        ? { status: query.status as CrmCustomerStatus }
        : {}),
      ...(query.assignedTo ? { assignedToId: query.assignedTo } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.crmCustomer.count({ where }),
      db.crmCustomer.findMany({
        where,
        orderBy: orderBy(
          query.sort,
          query.dir,
          ["createdAt", "updatedAt", "name", "status"],
          "createdAt",
        ),
        skip: (query.page - 1) * CRM_PAGE_SIZE,
        take: CRM_PAGE_SIZE,
      }),
    ]);
    const meta = pageMeta(query.page, total);
    return {
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        status: row.status,
        assignedToId: row.assignedToId,
        assignedToName: nameOf(map, row.assignedToId),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}

export async function listTasks(
  ctx: OrganizationContext,
  query: CrmListQuery,
  members: CrmMember[],
): Promise<CrmListResult<CrmTaskRow>> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const q = query.q;
    const where: Prisma.CrmTaskWhereInput = {
      ...(query.status && query.status in CrmTaskStatus
        ? { status: query.status as CrmTaskStatus }
        : {}),
      ...(query.assignedTo ? { assignedToId: query.assignedTo } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows, leads] = await Promise.all([
      db.crmTask.count({ where }),
      db.crmTask.findMany({
        where,
        orderBy: orderBy(
          query.sort,
          query.dir,
          ["dueAt", "createdAt", "updatedAt", "priority", "status"],
          "dueAt",
        ),
        skip: (query.page - 1) * CRM_PAGE_SIZE,
        take: CRM_PAGE_SIZE,
      }),
      db.crmLead.findMany({ select: { id: true, name: true } }),
    ]);
    const leadNames = new Map(leads.map((l) => [l.id, l.name]));
    const meta = pageMeta(query.page, total);
    return {
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      rows: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueAt: row.dueAt?.toISOString() ?? null,
        assignedToId: row.assignedToId,
        assignedToName: nameOf(map, row.assignedToId),
        leadId: row.leadId,
        leadName: row.leadId ? (leadNames.get(row.leadId) ?? null) : null,
        overdue: isOverdueTask(row.dueAt, row.status),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}

export async function listActivities(
  ctx: OrganizationContext,
  query: CrmListQuery,
  members: CrmMember[],
): Promise<CrmListResult<CrmActivityRow>> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const q = query.q;
    const where: Prisma.CrmActivityWhereInput = {
      ...(query.type && query.type in CrmActivityType
        ? { type: query.type as CrmActivityType }
        : {}),
      ...(q
        ? {
            OR: [
              { subject: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.crmActivity.count({ where }),
      db.crmActivity.findMany({
        where,
        orderBy: orderBy(
          query.sort,
          query.dir,
          ["occurredAt", "createdAt", "type"],
          "occurredAt",
        ),
        skip: (query.page - 1) * CRM_PAGE_SIZE,
        take: CRM_PAGE_SIZE,
        include: {
          lead: { select: { name: true } },
          contact: { select: { name: true } },
          customer: { select: { name: true } },
          company: { select: { name: true } },
        },
      }),
    ]);
    const meta = pageMeta(query.page, total);
    return {
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      rows: rows.map((row) => ({
        id: row.id,
        type: row.type,
        subject: row.subject,
        description: row.description,
        actorId: row.actorId,
        actorName: nameOf(map, row.actorId),
        leadId: row.leadId,
        leadName: row.lead?.name ?? null,
        contactName: row.contact?.name ?? null,
        customerName: row.customer?.name ?? null,
        companyName: row.company?.name ?? null,
        occurredAt: row.occurredAt.toISOString(),
      })),
    };
  });
}

export async function getLeadDetail(
  ctx: OrganizationContext,
  leadId: string,
  members: CrmMember[],
): Promise<CrmLeadDetail | null> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const lead = await db.crmLead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return null;
    }
    const [notes, followUps, activities, tasks] = await Promise.all([
      db.crmNote.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.crmFollowUp.findMany({
        where: { leadId },
        orderBy: { dueAt: "asc" },
        take: 50,
      }),
      db.crmActivity.findMany({
        where: { leadId },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
      db.crmTask.findMany({
        where: { leadId },
        orderBy: [{ dueAt: "asc" }],
        take: 50,
      }),
    ]);
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      assignedToId: lead.assignedToId,
      assignedToName: nameOf(map, lead.assignedToId),
      notesText: lead.notes,
      valueCents: lead.valueCents,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      followUps: followUps.map(
        (row): CrmFollowUpDto => ({
          id: row.id,
          type: row.type,
          dueAt: row.dueAt.toISOString(),
          notes: row.notes,
          status: row.status,
          assignedToId: row.assignedToId,
          assignedToName: nameOf(map, row.assignedToId),
          createdAt: row.createdAt.toISOString(),
        }),
      ),
      notes: notes.map(
        (row): CrmNoteDto => ({
          id: row.id,
          body: row.body,
          authorId: row.authorId,
          authorName: nameOf(map, row.authorId),
          createdAt: row.createdAt.toISOString(),
        }),
      ),
      activities: activities.map(
        (row): CrmActivityRow => ({
          id: row.id,
          type: row.type,
          subject: row.subject,
          description: row.description,
          actorId: row.actorId,
          actorName: nameOf(map, row.actorId),
          leadId: row.leadId,
          leadName: null,
          contactName: null,
          customerName: null,
          companyName: null,
          occurredAt: row.occurredAt.toISOString(),
        }),
      ),
      tasks: tasks.map(
        (row): CrmTaskRow => ({
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          dueAt: row.dueAt?.toISOString() ?? null,
          assignedToId: row.assignedToId,
          assignedToName: nameOf(map, row.assignedToId),
          leadId: row.leadId,
          leadName: lead.name,
          overdue: isOverdueTask(row.dueAt, row.status),
          createdAt: row.createdAt.toISOString(),
        }),
      ),
    };
  });
}

export async function getCrmOverview(
  ctx: OrganizationContext,
  members: CrmMember[],
): Promise<CrmOverview> {
  const map = memberMap(members);
  return orgScope(ctx, async () => {
    const [
      leadsTotal,
      leadsOpen,
      leadsWon,
      contactsTotal,
      companiesTotal,
      customersTotal,
      tasksOpen,
      recent,
    ] = await Promise.all([
      db.crmLead.count(),
      db.crmLead.count({
        where: { status: { notIn: [CrmLeadStatus.WON, CrmLeadStatus.LOST] } },
      }),
      db.crmLead.count({ where: { status: CrmLeadStatus.WON } }),
      db.crmContact.count(),
      db.crmCompany.count(),
      db.crmCustomer.count(),
      db.crmTask.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
        },
      }),
      db.crmActivity.findMany({
        orderBy: { occurredAt: "desc" },
        take: 6,
        include: {
          lead: { select: { name: true } },
          contact: { select: { name: true } },
          customer: { select: { name: true } },
          company: { select: { name: true } },
        },
      }),
    ]);
    return {
      leadsTotal,
      leadsOpen,
      leadsWon,
      contactsTotal,
      companiesTotal,
      customersTotal,
      tasksOpen,
      recentActivities: recent.map((row) => ({
        id: row.id,
        type: row.type,
        subject: row.subject,
        description: row.description,
        actorId: row.actorId,
        actorName: nameOf(map, row.actorId),
        leadId: row.leadId,
        leadName: row.lead?.name ?? null,
        contactName: row.contact?.name ?? null,
        customerName: row.customer?.name ?? null,
        companyName: row.company?.name ?? null,
        occurredAt: row.occurredAt.toISOString(),
      })),
    };
  });
}
