import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AuditLogCard from "@/components/super-admin/AuditLogCard";
import type { AuditLogRow } from "@/components/super-admin/types";
import { systemDb } from "@/server/db";
import { getTranslations } from "next-intl/server";

export default async function SuperAdminAuditLogPage() {
  const t = await getTranslations("superAdmin");

  const auditRows = await systemDb.platformAuditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
      actor: { select: { name: true } },
    },
  });

  const rows: AuditLogRow[] = auditRows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    metadata: row.metadata,
    ip: row.ip,
    createdAt: row.createdAt,
    actorName: row.actor?.name ?? null,
    organizationName: row.organization?.name ?? null,
  }));

  return (
    <>
      <PageBreadcrumb pageTitle={t("auditLog.title")} />
      <AuditLogCard rows={rows} />
    </>
  );
}
