import { getTranslations } from "next-intl/server";
import Image from "next/image";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { stateLabelKey } from "@/components/billing/states";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">
      <span className="text-theme-sm text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </span>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 dark:border-gray-800"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {label}
        </p>
        <p className="text-theme-xs uppercase text-gray-500 dark:text-gray-400">
          {color}
        </p>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const ctx = await requirePageModule("settings", PERMISSIONS.SETTINGS_READ);
  const t = await getTranslations("settings");
  const tModules = await getTranslations("sidebar.items");
  const tBilling = await getTranslations("billing");
  const tTemplates = await getTranslations("templates");

  const org = ctx.organization;
  const subscription = ctx.subscription;
  const primary = org.primaryColor ?? "#465fff";
  const secondary = org.secondaryColor ?? primary;
  const modules = [...ctx.modules].sort();
  const formatDate = (date: Date | null) =>
    date
      ? date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <>
      <PageBreadcrumb pageTitle={t("title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>

      <SettingsTabs />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("organization")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("organizationDesc")}
            </p>
          </div>
          <div className="px-6 py-2">
            <Field label={t("name")} value={org.name} />
            <Field label={t("slug")} value={org.slug} />
            <Field label={t("businessType")} value={org.businessType ?? "—"} />
            <Field
              label={t("industryTemplate")}
              value={tTemplates(`names.${org.templateKey}`)}
            />
            <Field label={t("currency")} value={org.currency ?? "—"} />
            <Field label={t("timezone")} value={org.timezone ?? "—"} />
            <Field label={t("memberRole")} value={ctx.role?.name ?? "—"} />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("branding")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("brandingDesc")}
            </p>
          </div>
          <div className="space-y-5 px-6 py-5">
            <div className="flex items-center gap-4">
              {org.logo ? (
                <Image
                  src={org.logo}
                  alt={org.name}
                  width={48}
                  height={48}
                  className="shrink-0 rounded-xl"
                  style={{ width: 48, height: 48 }}
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-lg font-semibold text-white">
                  {org.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {t("logo")}
                </p>
                <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                  {org.logo ?? org.name}
                </p>
              </div>
            </div>
            <ColorSwatch label={t("primaryColor")} color={primary} />
            <ColorSwatch label={t("secondaryColor")} color={secondary} />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white xl:col-span-2 dark:border-gray-800 dark:bg-white/3">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("plan")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("planDesc")}
            </p>
          </div>
          <div className="px-6 py-2">
            <Field
              label={t("plan")}
              value={subscription?.plan.name ?? "—"}
            />
            <Field
              label={t("status")}
              value={
                subscription
                  ? tBilling(stateLabelKey(subscription.state))
                  : tBilling("state.none")
              }
            />
            <Field
              label={t("currentPeriodEnd")}
              value={formatDate(subscription?.currentPeriodEnd ?? null)}
            />
          </div>
          <div className="px-6 pb-6 pt-2">
            <p className="mb-3 text-theme-sm text-gray-500 dark:text-gray-400">
              {t("enabledModules")}
            </p>
            <div className="flex flex-wrap gap-2">
              {modules.map((mod) => (
                <Badge key={mod} size="sm" color="primary">
                  {tModules(`items.${mod}`)}
                </Badge>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
