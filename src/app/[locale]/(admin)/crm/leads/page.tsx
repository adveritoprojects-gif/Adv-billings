import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LeadsList from "@/components/crm/LeadsList";
import { parseCrmListParams, listLeads, listMembers } from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.LEADS_READ);
  const t = await getTranslations("crm");

  const query = parseCrmListParams(await searchParams);
  const members = await listMembers(ctx);
  const result = await listLeads(ctx, query, members);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.LEADS_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("leads.title")} />
      <LeadsList
        rows={result.rows}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        query={query}
        members={members}
        canManage={canManage}
      />
    </>
  );
}
