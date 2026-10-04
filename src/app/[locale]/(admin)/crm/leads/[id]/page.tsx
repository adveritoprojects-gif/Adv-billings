import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LeadDetail from "@/components/crm/LeadDetail";
import { getLeadDetail, listMembers } from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { notFound } from "next/navigation";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.LEADS_READ);
  const { id } = await params;

  const members = await listMembers(ctx);
  const lead = await getLeadDetail(ctx, id, members);
  if (!lead) {
    notFound();
  }

  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.LEADS_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={lead.name} />
      <LeadDetail lead={lead} members={members} canManage={canManage} />
    </>
  );
}
