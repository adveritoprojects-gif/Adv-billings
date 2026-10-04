import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import UsageSection from "@/components/billing/UsageSection";
import OrgActivityCard from "@/components/super-admin/OrgActivityCard";
import OrgBrandingForm from "@/components/super-admin/OrgBrandingForm";
import OrgBusinessCard from "@/components/super-admin/OrgBusinessCard";
import OrgModulesCard from "@/components/super-admin/OrgModulesCard";
import OrgSettingsForm from "@/components/super-admin/OrgSettingsForm";
import OrgSubscriptionCard, {
  type PlanOption,
} from "@/components/super-admin/OrgSubscriptionCard";
import OrgUsersCard from "@/components/super-admin/OrgUsersCard";
import type { RoleOption } from "@/components/super-admin/AddMemberModal";
import { Link } from "@/i18n/navigation";
import type { BillingContext } from "@/server/billing/types";
import { getUsageSnapshots } from "@/server/billing/usage";
import { systemDb } from "@/server/db";
import {
  MEMBER_ROLE_KEYS,
  getOrganizationDetail,
} from "@/server/services/super-admin";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface SuperAdminOrganizationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SuperAdminOrganizationDetailPage({
  params,
}: SuperAdminOrganizationDetailPageProps) {
  const t = await getTranslations("superAdmin");
  const { id } = await params;

  const detail = await getOrganizationDetail(id);
  if (!detail) {
    notFound();
  }

  const [plans, roles, activityRows] = await Promise.all([
    systemDb.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    }),
    systemDb.role.findMany({
      where: { organizationId: null, isSystem: true },
      orderBy: { name: "asc" },
    }),
    systemDb.activityLog.findMany({
      where: { organizationId: detail.id },
      take: 25,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
    }),
  ]);

  const planOptions: PlanOption[] = plans.map((plan) => ({
    key: String(plan.key),
    name: plan.name,
    priceCents: plan.priceCents,
    currency: plan.currency,
    interval: String(plan.interval),
  }));

  const roleOptions: RoleOption[] = roles
    .filter((role) => (MEMBER_ROLE_KEYS as readonly string[]).includes(role.key))
    .map((role) => ({ key: role.key, name: role.name }));

  const billingCtx: BillingContext = {
    organization: { id: detail.id },
    role: { key: "super_admin" },
  };
  const snapshots = await getUsageSnapshots(billingCtx);

  return (
    <>
      <PageBreadcrumb pageTitle={detail.name} />

      <div className="mb-5">
        <Link
          href="/super-admin/organizations"
          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          {t("detail.back")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OrgBusinessCard detail={detail} />

        <ComponentCard
          title={t("detail.settings.title")}
          desc={t("detail.settings.description")}
        >
          <OrgSettingsForm
            organizationId={detail.id}
            defaults={{
              name: detail.name,
              slug: detail.slug,
              businessType: detail.businessType ?? "",
              timezone: detail.timezone ?? "",
              currency: detail.currency ?? "",
              dateFormat: detail.dateFormat ?? "",
            }}
          />
        </ComponentCard>

        <OrgSubscriptionCard
          organizationId={detail.id}
          subscription={detail.subscription}
          plans={planOptions}
        />

        <ComponentCard
          title={t("detail.branding.title")}
          desc={t("detail.branding.description")}
        >
          <OrgBrandingForm
            organizationId={detail.id}
            defaults={{
              primaryColor: detail.primaryColor ?? "",
              secondaryColor: detail.secondaryColor ?? "",
              logo: detail.logo ?? "",
              favicon: detail.favicon ?? "",
            }}
          />
        </ComponentCard>

        <OrgModulesCard
          organizationId={detail.id}
          modules={detail.modules}
        />

        <UsageSection snapshots={snapshots} />

        <div className="xl:col-span-2">
          <ComponentCard title={t("detail.users.title")}>
            <OrgUsersCard
              organizationId={detail.id}
              members={detail.members}
              roleOptions={roleOptions}
            />
          </ComponentCard>
        </div>

        <div className="xl:col-span-2">
          <OrgActivityCard
            rows={activityRows.map((row) => ({
              id: row.id,
              action: row.action,
              level: row.level,
              actorName: row.actor?.name ?? null,
              createdAt: row.createdAt,
            }))}
          />
        </div>
      </div>
    </>
  );
}
