"use client";

import { useSession } from "@/context/SessionContext";
import { Link, usePathname } from "@/i18n/navigation";
import { hasPermission, type PermissionKey } from "@/server/auth/permissions";
import { useTranslations } from "next-intl";

interface SettingsTab {
  key: string;
  href: string;
  permission: PermissionKey;
}

const SETTINGS_TABS: SettingsTab[] = [
  { key: "overview", href: "/settings", permission: "settings.read" },
  { key: "business", href: "/settings/business", permission: "settings.read" },
  { key: "branding", href: "/settings/branding", permission: "settings.read" },
  { key: "users", href: "/settings/users", permission: "members.read" },
  { key: "roles", href: "/settings/roles", permission: "roles.read" },
  { key: "modules", href: "/settings/modules", permission: "modules.read" },
];

export default function SettingsTabs() {
  const t = useTranslations("settings");
  const session = useSession();
  const pathname = usePathname();

  const tabs = SETTINGS_TABS.filter((tab) =>
    hasPermission(session.role.key, session.permissions, tab.permission),
  );

  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/3">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-lg bg-brand-50 px-4 py-2 text-theme-sm font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                : "rounded-lg px-4 py-2 text-theme-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-white/90"
            }
          >
            {t(`nav.${tab.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
