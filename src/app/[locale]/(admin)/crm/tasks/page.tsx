import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TasksList from "@/components/crm/TasksList";
import {
  listLeadOptions,
  listMembers,
  listTasks,
  parseCrmListParams,
} from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

interface TasksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CrmTasksPage({ searchParams }: TasksPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.TASKS_READ);
  const t = await getTranslations("crm");

  const query = parseCrmListParams(await searchParams);
  const members = await listMembers(ctx);
  const leads = await listLeadOptions(ctx);
  const result = await listTasks(ctx, query, members);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.TASKS_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("tasks.title")} />
      <TasksList
        rows={result.rows}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        query={query}
        members={members}
        leads={leads}
        canManage={canManage}
      />
    </>
  );
}
