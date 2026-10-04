"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import { useSidebar } from "../context/SidebarContext";
import { HorizontaLDots, LockIcon } from "../icons";
import { superAdminNavItems } from "./super-admin-nav-config";

const SuperAdminSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const isDesktop = useIsDesktop();
  const isDrawerHidden = !isDesktop && !isMobileOpen;
  const pathname = usePathname();
  const t = useTranslations("superAdmin");
  const tSidebar = useTranslations("sidebar");

  const isActive = (path: string) => path === pathname;
  const expanded = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      inert={isDrawerHidden ? true : undefined}
      aria-hidden={isDrawerHidden ? true : undefined}
      className={`fixed start-0 top-0 z-50 flex h-full flex-col border-e border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:mt-0 dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full"
      } xl:translate-x-0 xl:rtl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isMobileOpen && !isHovered
            ? "xl:justify-center"
            : "justify-start"
        }`}
      >
        <Link
          href="/super-admin"
          className="flex items-center gap-3"
          aria-label={t("brand.name")}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
            <LockIcon />
          </span>
          {expanded && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                {t("brand.name")}
              </span>
              <span className="block text-theme-xs text-gray-400">
                {t("brand.tagline")}
              </span>
            </span>
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isMobileOpen && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {expanded ? tSidebar("groups.menu") : <HorizontaLDots />}
              </h2>
              <ul className="flex flex-col gap-1">
                {superAdminNavItems.map((nav) => (
                  <li key={nav.key}>
                    <Link
                      href={nav.path}
                      className={cn(
                        "group menu-item",
                        isActive(nav.path)
                          ? "menu-item-active"
                          : "menu-item-inactive",
                        !isExpanded && !isHovered && !isMobileOpen
                          ? "lg:justify-center"
                          : "lg:justify-start",
                      )}
                    >
                      <span
                        className={cn(
                          isActive(nav.path)
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive",
                        )}
                      >
                        {nav.icon}
                      </span>
                      <span
                        className={cn(
                          "menu-item-text",
                          expanded ? "" : "sr-only",
                        )}
                      >
                        {t(`nav.${nav.key}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
