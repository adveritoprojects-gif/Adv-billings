import type { ReactNode } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import { getTemplateTerm } from "@/config/industry";
import { getTranslations } from "next-intl/server";

interface ModulePageProps {
  labelKey: string;
  icon: ReactNode;
  templateKey?: string;
}

export default async function ModulePage({
  labelKey,
  icon,
  templateKey,
}: ModulePageProps) {
  const tNav = await getTranslations("sidebar");
  const t = await getTranslations("modulePage");
  const label =
    (templateKey ? getTemplateTerm(templateKey, labelKey) : undefined) ??
    tNav(`items.${labelKey}`);

  return (
    <>
      <PageBreadcrumb pageTitle={label} />
      <ComponentCard title={label} desc={t("description", { module: label })}>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            {icon}
          </span>
          <Badge color="primary">{t("comingSoon")}</Badge>
        </div>
      </ComponentCard>
    </>
  );
}
