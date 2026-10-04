export interface SuperAdminActionResult {
  ok: boolean;
  errorKey?: string;
  id?: string;
}

export interface OrganizationListRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  businessType: string | null;
  createdAt: Date;
  memberCount: number;
  planName: string | null;
  subscriptionState: string | null;
}

export interface OrganizationMemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  roleKey: string;
  status: string;
  joinedAt: Date;
}

export interface PlatformMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  mrrCents: number;
  mrrCurrency: string;
}

export interface RecentActivityEntry {
  id: string;
  source: "activity" | "audit";
  action: string;
  summary?: string | null;
  metadata?: unknown;
  createdAt: Date;
  actorName: string | null;
  organizationName: string | null;
}

export interface AuditLogRow {
  id: string;
  action: string;
  summary: string;
  metadata?: unknown;
  ip: string | null;
  createdAt: Date;
  actorName: string | null;
  organizationName: string | null;
}
