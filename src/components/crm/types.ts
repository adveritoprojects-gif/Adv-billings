export interface CrmActionResult {
  ok: boolean;
  errorKey?: string;
  id?: string;
}

export type CrmSortDir = "asc" | "desc";

export interface CrmListQuery {
  q: string;
  status: string;
  assignedTo: string;
  type: string;
  sort: string;
  dir: CrmSortDir;
  page: number;
}

export const CRM_PAGE_SIZE = 10;

export interface CrmMember {
  id: string;
  name: string;
  email: string;
}

export interface CrmListResult<T> {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CrmLeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  assignedToName: string | null;
  notes: string | null;
  valueCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  companyId: string | null;
  companyName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface CrmCompanyRow {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  size: string | null;
  contactCount: number;
  createdAt: string;
}

export interface CrmCustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface CrmTaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  leadId: string | null;
  leadName: string | null;
  overdue: boolean;
  createdAt: string;
}

export interface CrmActivityRow {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  actorId: string | null;
  actorName: string | null;
  leadId: string | null;
  leadName: string | null;
  contactName: string | null;
  customerName: string | null;
  companyName: string | null;
  occurredAt: string;
}

export interface CrmNoteDto {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface CrmFollowUpDto {
  id: string;
  type: string;
  dueAt: string;
  notes: string | null;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface CrmLeadDetail extends Omit<CrmLeadRow, "notes"> {
  notesText: string | null;
  notes: CrmNoteDto[];
  followUps: CrmFollowUpDto[];
  activities: CrmActivityRow[];
  tasks: CrmTaskRow[];
}

export interface CrmOverview {
  leadsTotal: number;
  leadsOpen: number;
  leadsWon: number;
  contactsTotal: number;
  companiesTotal: number;
  customersTotal: number;
  tasksOpen: number;
  recentActivities: CrmActivityRow[];
}

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

export const TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELED",
] as const;

export const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "CHURNED"] as const;

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const LEAD_SOURCES = [
  "WEB_FORM",
  "REFERRAL",
  "IMPORT",
  "COLD_CALL",
  "SOCIAL",
  "ADS",
  "EVENT",
  "OTHER",
] as const;

export const FOLLOW_UP_TYPES = ["CALL", "EMAIL", "MEETING", "OTHER"] as const;

export const FOLLOW_UP_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "MISSED",
  "CANCELED",
] as const;

export const ACTIVITY_TYPES = [
  "CREATED",
  "STATUS_CHANGE",
  "ASSIGNMENT",
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "TASK",
  "SYSTEM",
] as const;
