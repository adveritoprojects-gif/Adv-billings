"use client";

import ComponentCard from "@/components/common/ComponentCard";
import Switch from "@/components/form/switch/Switch";
import { setModuleEnabledAction } from "@/server/actions/super-admin";
import type { OrganizationDetailModule } from "@/server/services/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface OrgModulesCardProps {
  organizationId: string;
  modules: OrganizationDetailModule[];
}

const OrgModulesCard: React.FC<OrgModulesCardProps> = ({
  organizationId,
  modules,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const handleToggle = (module: OrganizationDetailModule, enabled: boolean) => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await setModuleEnabledAction(
        organizationId,
        module.key,
        enabled,
      );
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
        setVersion((current) => current + 1);
      }
    });
  };

  return (
    <ComponentCard
      title={tSa("detail.modules.title")}
      desc={tSa("detail.modules.description")}
    >
      {errorKey ? (
        <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {t(errorKey)}
        </div>
      ) : null}
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {modules.map((module) => (
          <li
            key={module.id}
            className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {module.name}
                {module.isCore ? (
                  <span className="ms-2 text-theme-xs font-normal text-gray-400">
                    {tSa("detail.modules.core")}
                  </span>
                ) : null}
              </p>
              {module.description ? (
                <p className="mt-0.5 text-theme-xs text-gray-400">
                  {module.description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-theme-xs text-gray-400">
                {module.enabled
                  ? tSa("detail.modules.enabled")
                  : tSa("detail.modules.disabled")}
              </span>
              <Switch
                key={`${module.id}-${version}`}
                defaultChecked={module.enabled}
                disabled={module.isCore || isPending}
                onChange={(checked) => handleToggle(module, checked)}
              />
            </div>
          </li>
        ))}
      </ul>
    </ComponentCard>
  );
};

export default OrgModulesCard;
