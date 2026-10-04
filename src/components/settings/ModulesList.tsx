"use client";

import Switch from "@/components/form/switch/Switch";
import type { SettingsModuleRow } from "@/components/settings/types";
import { setModuleEnabledAction } from "@/server/actions/settings";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface ModulesListProps {
  modules: SettingsModuleRow[];
  canManage: boolean;
}

export default function ModulesList({ modules, canManage }: ModulesListProps) {
  const t = useTranslations();
  const tSettings = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const handleToggle = (module: SettingsModuleRow, enabled: boolean) => {
    setErrorKey(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("moduleKey", module.key);
      formData.set("enabled", enabled ? "1" : "0");
      const result = await setModuleEnabledAction(formData);
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
        setVersion((current) => current + 1);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {tSettings("modules.description")}
      </p>

      {errorKey ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        >
          {t(errorKey)}
        </div>
      ) : null}

      {modules.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSettings("modules.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {modules.map((module) => (
            <li
              key={module.key}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {module.name}
                  {module.isCore ? (
                    <span className="ms-2 text-theme-xs font-normal text-gray-400">
                      {tSettings("modules.core")}
                    </span>
                  ) : null}
                </p>
                {module.description ? (
                  <p className="mt-0.5 text-theme-xs text-gray-400">
                    {module.description}
                  </p>
                ) : null}
                {module.isCore ? (
                  <p className="mt-0.5 text-theme-xs text-gray-400">
                    {tSettings("modules.coreLocked")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-theme-xs text-gray-400">
                  {module.enabled
                    ? tSettings("modules.enabled")
                    : tSettings("modules.disabled")}
                </span>
                <Switch
                  key={`${module.key}-${version}`}
                  defaultChecked={module.enabled}
                  disabled={!canManage || module.isCore || isPending}
                  onChange={(checked) => handleToggle(module, checked)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
