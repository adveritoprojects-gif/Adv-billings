"use server";

import {
  CrmActivityType,
  CrmCustomerStatus,
  CrmFollowUpStatus,
  CrmFollowUpType,
  CrmLeadSource,
  CrmLeadStatus,
  CrmPriority,
  CrmTaskStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { CrmActionResult } from "@/components/crm/types";
import { isBillingError } from "@/server/billing/errors";
import { canCreateCustomer, canCreateLead } from "@/server/billing/limits";
import { requireWriteAccess } from "@/server/billing/subscription";
import { syncUsage } from "@/server/billing/usage";
import { AuthError } from "@/server/auth/errors";
import {
  requireOrganization,
  type OrganizationContext,
} from "@/server/auth/guards";
import { hasPermission, type PermissionKey } from "@/server/auth/permissions";
import { db, orgScope } from "@/server/db";
import { logActivity } from "@/server/services/activity";

function str(value: FormDataEntryValue | null, max = 500): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function isEnumValue<T extends Record<string, string>>(
  value: string,
  enumObject: T,
): boolean {
  return Object.values(enumObject).includes(value);
}

function validEmail(value: string): boolean {
  if (!value) {
    return true;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function runCrm(
  permission: PermissionKey,
  fn: (ctx: OrganizationContext) => Promise<CrmActionResult>,
): Promise<CrmActionResult> {
  try {
    const ctx = await requireOrganization();
    if (
      ctx.role.key !== "super_admin" &&
      !hasPermission(ctx.role.key, ctx.permissions, permission)
    ) {
      return { ok: false, errorKey: "crm.errors.forbidden" };
    }
    await requireWriteAccess(ctx, "crm");
    const result = await fn(ctx);
    if (result.ok) {
      revalidatePath("/crm", "layout");
    }
    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    if (isBillingError(error)) {
      return { ok: false, errorKey: error.errorKey };
    }
    if (error instanceof AuthError) {
      return { ok: false, errorKey: "crm.errors.forbidden" };
    }
    console.error("CRM action failed:", error);
    return { ok: false, errorKey: "crm.errors.generic" };
  }
}

async function audit(
  ctx: OrganizationContext,
  action: string,
  entityId?: string,
): Promise<void> {
  await logActivity(ctx.organization.id, {
    action,
    actorId: ctx.user.id,
    entity: "crm",
    entityId: entityId ?? null,
  }).catch(() => undefined);
}

async function resolveAssignee(
  ctx: OrganizationContext,
  userId: string,
): Promise<{ ok: true; value: string | null } | { ok: false }> {
  if (!userId) {
    return { ok: true, value: null };
  }
  const member = await orgScope(ctx, () =>
    db.organizationMember.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { userId: true },
    }),
  );
  if (!member) {
    return { ok: false };
  }
  return { ok: true, value: member.userId };
}

interface TimelineInput {
  type: CrmActivityType;
  subject: string;
  description?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  companyId?: string | null;
  taskId?: string | null;
}

async function timeline(
  ctx: OrganizationContext,
  input: TimelineInput,
): Promise<void> {
  await orgScope(ctx, () =>
    db.crmActivity.create({
      data: {
        organizationId: ctx.organization.id,
        type: input.type,
        subject: input.subject,
        description: input.description ?? null,
        actorId: ctx.user.id,
        leadId: input.leadId ?? null,
        contactId: input.contactId ?? null,
        customerId: input.customerId ?? null,
        companyId: input.companyId ?? null,
        taskId: input.taskId ?? null,
      },
    }),
  );
}

interface LeadFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  priority: string;
  assignedTo: string;
  notes: string;
  value: string;
}

function parseLeadFields(formData: FormData): LeadFields {
  return {
    name: str(formData.get("name"), 200),
    email: str(formData.get("email"), 320),
    phone: str(formData.get("phone"), 60),
    company: str(formData.get("company"), 200),
    source: str(formData.get("source"), 40) || "OTHER",
    status: str(formData.get("status"), 40) || "NEW",
    priority: str(formData.get("priority"), 40) || "MEDIUM",
    assignedTo: str(formData.get("assignedToId"), 60),
    notes: str(formData.get("notes"), 4000),
    value: String(formData.get("value") ?? "").trim(),
  };
}

function parseValueCents(value: string): number | null | "invalid" {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "invalid";
  }
  return Math.round(parsed * 100);
}

function validateLeadFields(
  fields: LeadFields,
): CrmActionResult | null {
  if (!fields.name) {
    return { ok: false, errorKey: "crm.errors.nameRequired" };
  }
  if (!validEmail(fields.email)) {
    return { ok: false, errorKey: "crm.errors.invalidEmail" };
  }
  if (!isEnumValue(fields.source, CrmLeadSource)) {
    return { ok: false, errorKey: "crm.errors.invalidSource" };
  }
  if (!isEnumValue(fields.status, CrmLeadStatus)) {
    return { ok: false, errorKey: "crm.errors.invalidStatus" };
  }
  if (!isEnumValue(fields.priority, CrmPriority)) {
    return { ok: false, errorKey: "crm.errors.invalidPriority" };
  }
  if (parseValueCents(fields.value) === "invalid") {
    return { ok: false, errorKey: "crm.errors.invalidValue" };
  }
  return null;
}

export async function createLead(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const fields = parseLeadFields(formData);
    const invalid = validateLeadFields(fields);
    if (invalid) {
      return invalid;
    }
    const limit = await canCreateLead(ctx);
    if (!limit.ok) {
      return { ok: false, errorKey: limit.errorKey };
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const lead = await orgScope(ctx, () =>
      db.crmLead.create({
        data: {
          organizationId: ctx.organization.id,
          name: fields.name,
          email: fields.email || null,
          phone: fields.phone || null,
          company: fields.company || null,
          source: fields.source as CrmLeadSource,
          status: fields.status as CrmLeadStatus,
          priority: fields.priority as CrmPriority,
          assignedToId: assignee.value,
          notes: fields.notes || null,
          valueCents: (() => {
            const cents = parseValueCents(fields.value);
            return cents === "invalid" ? null : cents;
          })(),
        },
      }),
    );
    await timeline(ctx, {
      type: "CREATED",
      subject: `Lead ${lead.name} created`,
      leadId: lead.id,
    });
    await audit(ctx, "crm.lead.created", lead.id);
    await syncUsage(ctx, "LEADS");
    return { ok: true, id: lead.id };
  });
}

export async function updateLead(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const id = str(formData.get("id"), 60);
    if (!id) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const fields = parseLeadFields(formData);
    const invalid = validateLeadFields(fields);
    if (invalid) {
      return invalid;
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const current = await orgScope(ctx, () =>
      db.crmLead.findUnique({ where: { id } }),
    );
    if (!current) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmLead.update({
        where: { id },
        data: {
          name: fields.name,
          email: fields.email || null,
          phone: fields.phone || null,
          company: fields.company || null,
          source: fields.source as CrmLeadSource,
          status: fields.status as CrmLeadStatus,
          priority: fields.priority as CrmPriority,
          assignedToId: assignee.value,
          notes: fields.notes || null,
          valueCents: (() => {
            const cents = parseValueCents(fields.value);
            return cents === "invalid" ? null : cents;
          })(),
        },
      }),
    );
    if (current.status !== (fields.status as CrmLeadStatus)) {
      await timeline(ctx, {
        type: "STATUS_CHANGE",
        subject: `Status changed to ${fields.status}`,
        description: `${current.status} → ${fields.status}`,
        leadId: id,
      });
    }
    if (current.assignedToId !== assignee.value) {
      await timeline(ctx, {
        type: "ASSIGNMENT",
        subject: assignee.value
          ? "Owner assigned"
          : "Owner removed",
        leadId: id,
      });
    }
    await audit(ctx, "crm.lead.updated", id);
    return { ok: true, id };
  });
}

export async function deleteLead(id: string): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const lead = await orgScope(ctx, () =>
      db.crmLead.findUnique({ where: { id }, select: { name: true } }),
    );
    if (!lead) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmLead.delete({ where: { id } }));
    await audit(ctx, "crm.lead.deleted", id);
    return { ok: true, id };
  });
}

export async function setLeadStatus(
  id: string,
  status: string,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    if (!isEnumValue(status, CrmLeadStatus)) {
      return { ok: false, errorKey: "crm.errors.invalidStatus" };
    }
    const lead = await orgScope(ctx, () =>
      db.crmLead.findUnique({ where: { id } }),
    );
    if (!lead) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    if (lead.status === status) {
      return { ok: true, id };
    }
    await orgScope(ctx, () =>
      db.crmLead.update({ where: { id }, data: { status: status as CrmLeadStatus } }),
    );
    await timeline(ctx, {
      type: "STATUS_CHANGE",
      subject: `Status changed to ${status}`,
      description: `${lead.status} → ${status}`,
      leadId: id,
    });
    await audit(ctx, "crm.lead.status_changed", id);
    return { ok: true, id };
  });
}

export async function assignLead(
  id: string,
  assignedToId: string | null,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const assignee = await resolveAssignee(ctx, assignedToId ?? "");
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const lead = await orgScope(ctx, () =>
      db.crmLead.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!lead) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmLead.update({
        where: { id },
        data: { assignedToId: assignee.value },
      }),
    );
    await timeline(ctx, {
      type: "ASSIGNMENT",
      subject: assignee.value ? "Owner assigned" : "Owner removed",
      leadId: id,
    });
    await audit(ctx, "crm.lead.assigned", id);
    return { ok: true, id };
  });
}

interface ContactFields {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  assignedTo: string;
}

function parseContactFields(formData: FormData): ContactFields {
  return {
    name: str(formData.get("name"), 200),
    email: str(formData.get("email"), 320),
    phone: str(formData.get("phone"), 60),
    jobTitle: str(formData.get("jobTitle"), 120),
    companyId: str(formData.get("companyId"), 60),
    assignedTo: str(formData.get("assignedToId"), 60),
  };
}

export async function createContact(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("contacts.manage", async (ctx) => {
    const fields = parseContactFields(formData);
    if (!fields.name) {
      return { ok: false, errorKey: "crm.errors.nameRequired" };
    }
    if (!validEmail(fields.email)) {
      return { ok: false, errorKey: "crm.errors.invalidEmail" };
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    if (fields.companyId) {
      const company = await orgScope(ctx, () =>
        db.crmCompany.findUnique({
          where: { id: fields.companyId },
          select: { id: true },
        }),
      );
      if (!company) {
        return { ok: false, errorKey: "crm.errors.invalidCompany" };
      }
    }
    const contact = await orgScope(ctx, () =>
      db.crmContact.create({
        data: {
          organizationId: ctx.organization.id,
          name: fields.name,
          email: fields.email || null,
          phone: fields.phone || null,
          jobTitle: fields.jobTitle || null,
          companyId: fields.companyId || null,
          assignedToId: assignee.value,
        },
      }),
    );
    await timeline(ctx, {
      type: "CREATED",
      subject: `Contact ${contact.name} created`,
      contactId: contact.id,
    });
    await audit(ctx, "crm.contact.created", contact.id);
    return { ok: true, id: contact.id };
  });
}

export async function updateContact(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("contacts.manage", async (ctx) => {
    const id = str(formData.get("id"), 60);
    if (!id) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const fields = parseContactFields(formData);
    if (!fields.name) {
      return { ok: false, errorKey: "crm.errors.nameRequired" };
    }
    if (!validEmail(fields.email)) {
      return { ok: false, errorKey: "crm.errors.invalidEmail" };
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const current = await orgScope(ctx, () =>
      db.crmContact.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!current) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmContact.update({
        where: { id },
        data: {
          name: fields.name,
          email: fields.email || null,
          phone: fields.phone || null,
          jobTitle: fields.jobTitle || null,
          companyId: fields.companyId || null,
          assignedToId: assignee.value,
        },
      }),
    );
    await audit(ctx, "crm.contact.updated", id);
    return { ok: true, id };
  });
}

export async function deleteContact(id: string): Promise<CrmActionResult> {
  return runCrm("contacts.manage", async (ctx) => {
    const contact = await orgScope(ctx, () =>
      db.crmContact.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!contact) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmContact.delete({ where: { id } }));
    await audit(ctx, "crm.contact.deleted", id);
    return { ok: true, id };
  });
}

interface CompanyFields {
  name: string;
  website: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  size: string;
}

function parseCompanyFields(formData: FormData): CompanyFields {
  return {
    name: str(formData.get("name"), 200),
    website: str(formData.get("website"), 300),
    industry: str(formData.get("industry"), 120),
    email: str(formData.get("email"), 320),
    phone: str(formData.get("phone"), 60),
    address: str(formData.get("address"), 400),
    size: str(formData.get("size"), 60),
  };
}

function validateCompanyFields(fields: CompanyFields): CrmActionResult | null {
  if (!fields.name) {
    return { ok: false, errorKey: "crm.errors.nameRequired" };
  }
  if (!validEmail(fields.email)) {
    return { ok: false, errorKey: "crm.errors.invalidEmail" };
  }
  return null;
}

export async function createCompany(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("companies.manage", async (ctx) => {
    const fields = parseCompanyFields(formData);
    const invalid = validateCompanyFields(fields);
    if (invalid) {
      return invalid;
    }
    const company = await orgScope(ctx, () =>
      db.crmCompany.create({
        data: {
          organizationId: ctx.organization.id,
          name: fields.name,
          website: fields.website || null,
          industry: fields.industry || null,
          email: fields.email || null,
          phone: fields.phone || null,
          address: fields.address || null,
          size: fields.size || null,
        },
      }),
    );
    await timeline(ctx, {
      type: "CREATED",
      subject: `Company ${company.name} created`,
      companyId: company.id,
    });
    await audit(ctx, "crm.company.created", company.id);
    return { ok: true, id: company.id };
  });
}

export async function updateCompany(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("companies.manage", async (ctx) => {
    const id = str(formData.get("id"), 60);
    if (!id) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const fields = parseCompanyFields(formData);
    const invalid = validateCompanyFields(fields);
    if (invalid) {
      return invalid;
    }
    const current = await orgScope(ctx, () =>
      db.crmCompany.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!current) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmCompany.update({
        where: { id },
        data: {
          name: fields.name,
          website: fields.website || null,
          industry: fields.industry || null,
          email: fields.email || null,
          phone: fields.phone || null,
          address: fields.address || null,
          size: fields.size || null,
        },
      }),
    );
    await audit(ctx, "crm.company.updated", id);
    return { ok: true, id };
  });
}

export async function deleteCompany(id: string): Promise<CrmActionResult> {
  return runCrm("companies.manage", async (ctx) => {
    const company = await orgScope(ctx, () =>
      db.crmCompany.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!company) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmCompany.delete({ where: { id } }));
    await audit(ctx, "crm.company.deleted", id);
    return { ok: true, id };
  });
}

interface CustomerFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  assignedTo: string;
  notes: string;
}

function parseCustomerFields(formData: FormData): CustomerFields {
  return {
    name: str(formData.get("name"), 200),
    email: str(formData.get("email"), 320),
    phone: str(formData.get("phone"), 60),
    company: str(formData.get("company"), 200),
    status: str(formData.get("status"), 40) || "ACTIVE",
    assignedTo: str(formData.get("assignedToId"), 60),
    notes: str(formData.get("notes"), 4000),
  };
}

function validateCustomerFields(fields: CustomerFields): CrmActionResult | null {
  if (!fields.name) {
    return { ok: false, errorKey: "crm.errors.nameRequired" };
  }
  if (!validEmail(fields.email)) {
    return { ok: false, errorKey: "crm.errors.invalidEmail" };
  }
  if (!isEnumValue(fields.status, CrmCustomerStatus)) {
    return { ok: false, errorKey: "crm.errors.invalidStatus" };
  }
  return null;
}

export async function createCustomer(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("customers.manage", async (ctx) => {
    const fields = parseCustomerFields(formData);
    const invalid = validateCustomerFields(fields);
    if (invalid) {
      return invalid;
    }
    const limit = await canCreateCustomer(ctx);
    if (!limit.ok) {
      return { ok: false, errorKey: limit.errorKey };
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const customer = await orgScope(ctx, () =>
      db.crmCustomer.create({
        data: {
          organizationId: ctx.organization.id,
          name: fields.name,
          email: fields.email || null,
          phone: fields.phone || null,
          company: fields.company || null,
          status: fields.status as CrmCustomerStatus,
          assignedToId: assignee.value,
          notes: fields.notes || null,
        },
      }),
    );
    await timeline(ctx, {
      type: "CREATED",
      subject: `Customer ${customer.name} created`,
      customerId: customer.id,
    });
    await audit(ctx, "crm.customer.created", customer.id);
    await syncUsage(ctx, "CUSTOMERS");
    return { ok: true, id: customer.id };
  });
}

export async function updateCustomer(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("customers.manage", async (ctx) => {
    const id = str(formData.get("id"), 60);
    if (!id) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const fields = parseCustomerFields(formData);
    const invalid = validateCustomerFields(fields);
    if (invalid) {
      return invalid;
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const current = await orgScope(ctx, () =>
      db.crmCustomer.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!current) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmCustomer.update({
        where: { id },
        data: {
          name: fields.name,
          email: fields.email || null,
          phone: fields.phone || null,
          company: fields.company || null,
          status: fields.status as CrmCustomerStatus,
          assignedToId: assignee.value,
          notes: fields.notes || null,
        },
      }),
    );
    await audit(ctx, "crm.customer.updated", id);
    return { ok: true, id };
  });
}

export async function deleteCustomer(id: string): Promise<CrmActionResult> {
  return runCrm("customers.manage", async (ctx) => {
    const customer = await orgScope(ctx, () =>
      db.crmCustomer.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!customer) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmCustomer.delete({ where: { id } }));
    await audit(ctx, "crm.customer.deleted", id);
    return { ok: true, id };
  });
}

interface TaskFields {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: string;
  assignedTo: string;
  leadId: string;
}

function parseTaskFields(formData: FormData): TaskFields {
  return {
    title: str(formData.get("title"), 300),
    description: str(formData.get("description"), 4000),
    status: str(formData.get("status"), 40) || "OPEN",
    priority: str(formData.get("priority"), 40) || "MEDIUM",
    dueAt: str(formData.get("dueAt"), 40),
    assignedTo: str(formData.get("assignedToId"), 60),
    leadId: str(formData.get("leadId"), 60),
  };
}

function validateTaskFields(fields: TaskFields): CrmActionResult | null {
  if (!fields.title) {
    return { ok: false, errorKey: "crm.errors.titleRequired" };
  }
  if (!isEnumValue(fields.status, CrmTaskStatus)) {
    return { ok: false, errorKey: "crm.errors.invalidStatus" };
  }
  if (!isEnumValue(fields.priority, CrmPriority)) {
    return { ok: false, errorKey: "crm.errors.invalidPriority" };
  }
  if (fields.dueAt && Number.isNaN(Date.parse(fields.dueAt))) {
    return { ok: false, errorKey: "crm.errors.invalidDueDate" };
  }
  return null;
}

export async function createTask(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("tasks.manage", async (ctx) => {
    const fields = parseTaskFields(formData);
    const invalid = validateTaskFields(fields);
    if (invalid) {
      return invalid;
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    if (fields.leadId) {
      const lead = await orgScope(ctx, () =>
        db.crmLead.findUnique({
          where: { id: fields.leadId },
          select: { id: true },
        }),
      );
      if (!lead) {
        return { ok: false, errorKey: "crm.errors.notFound" };
      }
    }
    const task = await orgScope(ctx, () =>
      db.crmTask.create({
        data: {
          organizationId: ctx.organization.id,
          title: fields.title,
          description: fields.description || null,
          status: fields.status as CrmTaskStatus,
          priority: fields.priority as CrmPriority,
          dueAt: fields.dueAt ? new Date(fields.dueAt) : null,
          assignedToId: assignee.value,
          leadId: fields.leadId || null,
        },
      }),
    );
    if (task.leadId) {
      await timeline(ctx, {
        type: "TASK",
        subject: `Task created: ${task.title}`,
        leadId: task.leadId,
        taskId: task.id,
      });
    }
    await audit(ctx, "crm.task.created", task.id);
    return { ok: true, id: task.id };
  });
}

export async function updateTask(
  formData: FormData,
): Promise<CrmActionResult> {
  return runCrm("tasks.manage", async (ctx) => {
    const id = str(formData.get("id"), 60);
    if (!id) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const fields = parseTaskFields(formData);
    const invalid = validateTaskFields(fields);
    if (invalid) {
      return invalid;
    }
    const assignee = await resolveAssignee(ctx, fields.assignedTo);
    if (!assignee.ok) {
      return { ok: false, errorKey: "crm.errors.invalidAssignee" };
    }
    const current = await orgScope(ctx, () =>
      db.crmTask.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!current) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmTask.update({
        where: { id },
        data: {
          title: fields.title,
          description: fields.description || null,
          status: fields.status as CrmTaskStatus,
          priority: fields.priority as CrmPriority,
          dueAt: fields.dueAt ? new Date(fields.dueAt) : null,
          assignedToId: assignee.value,
          leadId: fields.leadId || null,
        },
      }),
    );
    await audit(ctx, "crm.task.updated", id);
    return { ok: true, id };
  });
}

export async function deleteTask(id: string): Promise<CrmActionResult> {
  return runCrm("tasks.manage", async (ctx) => {
    const task = await orgScope(ctx, () =>
      db.crmTask.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!task) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmTask.delete({ where: { id } }));
    await audit(ctx, "crm.task.deleted", id);
    return { ok: true, id };
  });
}

export async function setTaskStatus(
  id: string,
  status: string,
): Promise<CrmActionResult> {
  return runCrm("tasks.manage", async (ctx) => {
    if (!isEnumValue(status, CrmTaskStatus)) {
      return { ok: false, errorKey: "crm.errors.invalidStatus" };
    }
    const task = await orgScope(ctx, () =>
      db.crmTask.findUnique({ where: { id }, select: { id: true, leadId: true } }),
    );
    if (!task) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmTask.update({
        where: { id },
        data: { status: status as CrmTaskStatus },
      }),
    );
    if (task.leadId) {
      await timeline(ctx, {
        type: "TASK",
        subject: `Task status changed to ${status}`,
        leadId: task.leadId,
        taskId: task.id,
      });
    }
    await audit(ctx, "crm.task.status_changed", id);
    return { ok: true, id };
  });
}

export async function addNote(
  entityType: "lead" | "contact" | "customer" | "company" | "task",
  entityId: string,
  body: string,
): Promise<CrmActionResult> {
  return runCrm(
    entityType === "lead"
      ? "leads.manage"
      : entityType === "contact"
        ? "contacts.manage"
        : entityType === "customer"
          ? "customers.manage"
          : entityType === "company"
            ? "companies.manage"
            : "tasks.manage",
    async (ctx) => {
      const text = body.trim().slice(0, 4000);
      if (!text) {
        return { ok: false, errorKey: "crm.errors.bodyRequired" };
      }
      const parent = await orgScope(ctx, () => {
        switch (entityType) {
          case "lead":
            return db.crmLead.findUnique({
              where: { id: entityId },
              select: { id: true },
            });
          case "contact":
            return db.crmContact.findUnique({
              where: { id: entityId },
              select: { id: true },
            });
          case "customer":
            return db.crmCustomer.findUnique({
              where: { id: entityId },
              select: { id: true },
            });
          case "company":
            return db.crmCompany.findUnique({
              where: { id: entityId },
              select: { id: true },
            });
          default:
            return db.crmTask.findUnique({
              where: { id: entityId },
              select: { id: true },
            });
        }
      });
      if (!parent) {
        return { ok: false, errorKey: "crm.errors.notFound" };
      }
      const note = await orgScope(ctx, () =>
        db.crmNote.create({
          data: {
            organizationId: ctx.organization.id,
            body: text,
            authorId: ctx.user.id,
            leadId: entityType === "lead" ? entityId : null,
            contactId: entityType === "contact" ? entityId : null,
            customerId: entityType === "customer" ? entityId : null,
            companyId: entityType === "company" ? entityId : null,
            taskId: entityType === "task" ? entityId : null,
          },
        }),
      );
      if (entityType === "lead") {
        await timeline(ctx, {
          type: "NOTE",
          subject: "Note added",
          leadId: entityId,
        });
      }
      await audit(ctx, "crm.note.created", note.id);
      return { ok: true, id: note.id };
    },
  );
}

export async function deleteNote(id: string): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const note = await orgScope(ctx, () =>
      db.crmNote.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!note) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmNote.delete({ where: { id } }));
    await audit(ctx, "crm.note.deleted", id);
    return { ok: true, id };
  });
}

export async function addFollowUp(
  leadId: string,
  type: string,
  dueAt: string,
  notes: string,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    if (!isEnumValue(type, CrmFollowUpType)) {
      return { ok: false, errorKey: "crm.errors.invalidType" };
    }
    if (!dueAt || Number.isNaN(Date.parse(dueAt))) {
      return { ok: false, errorKey: "crm.errors.invalidDueDate" };
    }
    const lead = await orgScope(ctx, () =>
      db.crmLead.findUnique({ where: { id: leadId }, select: { id: true } }),
    );
    if (!lead) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const followUp = await orgScope(ctx, () =>
      db.crmFollowUp.create({
        data: {
          organizationId: ctx.organization.id,
          type: type as CrmFollowUpType,
          dueAt: new Date(dueAt),
          notes: notes.trim().slice(0, 2000) || null,
          leadId,
          assignedToId: ctx.user.id,
        },
      }),
    );
    await timeline(ctx, {
      type: "FOLLOW_UP",
      subject: `Follow-up scheduled (${type})`,
      leadId,
    });
    await audit(ctx, "crm.follow_up.created", followUp.id);
    return { ok: true, id: followUp.id };
  });
}

export async function setFollowUpStatus(
  id: string,
  status: string,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    if (!isEnumValue(status, CrmFollowUpStatus)) {
      return { ok: false, errorKey: "crm.errors.invalidStatus" };
    }
    const followUp = await orgScope(ctx, () =>
      db.crmFollowUp.findUnique({ where: { id }, select: { leadId: true } }),
    );
    if (!followUp) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () =>
      db.crmFollowUp.update({
        where: { id },
        data: {
          status: status as CrmFollowUpStatus,
          completedAt:
            status === "COMPLETED" ? new Date() : null,
        },
      }),
    );
    if (followUp.leadId) {
      await timeline(ctx, {
        type: "FOLLOW_UP",
        subject: `Follow-up marked ${status}`,
        leadId: followUp.leadId,
      });
    }
    await audit(ctx, "crm.follow_up.status_changed", id);
    return { ok: true, id };
  });
}

export async function deleteFollowUp(id: string): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const followUp = await orgScope(ctx, () =>
      db.crmFollowUp.findUnique({ where: { id }, select: { id: true } }),
    );
    if (!followUp) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    await orgScope(ctx, () => db.crmFollowUp.delete({ where: { id } }));
    await audit(ctx, "crm.follow_up.deleted", id);
    return { ok: true, id };
  });
}

export async function logCrmActivity(
  leadId: string,
  type: string,
  subject: string,
  description: string,
): Promise<CrmActionResult> {
  return runCrm("leads.manage", async (ctx) => {
    const text = subject.trim().slice(0, 300);
    if (!text) {
      return { ok: false, errorKey: "crm.errors.subjectRequired" };
    }
    if (!isEnumValue(type, CrmActivityType)) {
      return { ok: false, errorKey: "crm.errors.invalidType" };
    }
    const lead = await orgScope(ctx, () =>
      db.crmLead.findUnique({ where: { id: leadId }, select: { id: true } }),
    );
    if (!lead) {
      return { ok: false, errorKey: "crm.errors.notFound" };
    }
    const activity = await orgScope(ctx, () =>
      db.crmActivity.create({
        data: {
          organizationId: ctx.organization.id,
          type: type as CrmActivityType,
          subject: text,
          description: description.trim().slice(0, 2000) || null,
          actorId: ctx.user.id,
          leadId,
        },
      }),
    );
    await audit(ctx, "crm.activity.logged", activity.id);
    return { ok: true, id: activity.id };
  });
}
