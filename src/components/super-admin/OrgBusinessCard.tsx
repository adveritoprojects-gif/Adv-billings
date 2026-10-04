import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import { getLocale, getTranslations } from "next-intl/server";
import type { OrganizationDetail } from "@/server/services/super-admin";
import { orgStatusColor } from "./statusBadge";

const OrgBusinessCard: React.FC<{
  detail: OrganizationDetail;
}> = async ({ detail }) => {
  const t = await getTranslations("superAdmin");
  const tTemplates = await getTranslations("templates");
  const locale = await getLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("detail.business.name"), value: detail.name },
    { label: t("detail.business.slug"), value: detail.slug },
    { label: t("detail.business.businessType"), value: detail.businessType ?? "—" },
    { label: t("detail.business.email"), value: detail.email ?? "—" },
    { label: t("detail.business.phone"), value: detail.phone ?? "—" },
    { label: t("detail.business.website"), value: detail.website ?? "—" },
    { label: t("detail.business.address"), value: detail.address ?? "—" },
    {
      label: t("detail.business.template"),
      value: tTemplates(`names.${detail.templateKey}`),
    },
    { label: t("detail.business.timezone"), value: detail.timezone ?? "—" },
    { label: t("detail.business.currency"), value: detail.currency ?? "—" },
    { label: t("detail.business.dateFormat"), value: detail.dateFormat ?? "—" },
    {
      label: t("detail.business.status"),
      value: (
        <Badge color={orgStatusColor(detail.status)} size="sm">
          {t(`organizations.statuses.${detail.status}`)}
        </Badge>
      ),
    },
    { label: t("detail.business.members"), value: String(detail.memberCount) },
    {
      label: t("detail.business.created"),
      value: dateFormat.format(new Date(detail.createdAt)),
    },
    {
      label: t("detail.business.subscription"),
      value: detail.subscription
        ? detail.subscription.planName
        : t("detail.business.noSubscription"),
    },
  ];

  return (
    <ComponentCard title={t("detail.business.title")}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-theme-xs text-gray-400">{row.label}</dt>
            <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </ComponentCard>
  );
};

export default OrgBusinessCard;
