import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CompaniesList from "@/components/crm/CompaniesList";
import { listCompanies, parseCrmListParams } from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

interface CompaniesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.COMPANIES_READ);
  const t = await getTranslations("crm");

  const query = parseCrmListParams(await searchParams);
  const result = await listCompanies(ctx, query);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.COMPANIES_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("companies.title")} />
      <CompaniesList
        rows={result.rows}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        query={query}
        canManage={canManage}
      />
    </>
  );
}
