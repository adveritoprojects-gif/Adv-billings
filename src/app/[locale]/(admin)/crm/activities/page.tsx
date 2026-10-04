import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ActivitiesList from "@/components/crm/ActivitiesList";
import { listActivities, listMembers, parseCrmListParams } from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

interface ActivitiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.ACTIVITIES_READ);
  const t = await getTranslations("crm");

  const query = parseCrmListParams(await searchParams);
  const members = await listMembers(ctx);
  const result = await listActivities(ctx, query, members);

  return (
    <>
      <PageBreadcrumb pageTitle={t("activities.title")} />
      <ActivitiesList
        rows={result.rows}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        query={query}
      />
    </>
  );
}
