import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CustomersList from "@/components/crm/CustomersList";
import { listCustomers, listMembers, parseCrmListParams } from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

interface CustomersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.CUSTOMERS_READ);
  const t = await getTranslations("crm");

  const query = parseCrmListParams(await searchParams);
  const members = await listMembers(ctx);
  const result = await listCustomers(ctx, query, members);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.CUSTOMERS_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("customers.title")} />
      <CustomersList
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
