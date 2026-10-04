"use client";

import { getIndustryTemplate, applyTemplateNav } from "@/config/industry";
import { useSession } from "@/context/SessionContext";
import { Link, usePathname } from "@/i18n/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { ChevronDownIcon, HorizontaLDots } from "../icons/index";
import {
  mainNavItems,
  otherNavItems,
  type NavChild,
  type NavItem,
} from "./nav-config";
import SidebarWidget from "./SidebarWidget";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const isDesktop = useIsDesktop();
  const isDrawerHidden = !isDesktop && !isMobileOpen;
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tTemplates = useTranslations("templates");
  const session = useSession();
  const templateKey = session.organization.templateKey;
  const template = getIndustryTemplate(templateKey);
  const navLabel = (key: string) => {
    const termKey = `terms.${templateKey}.${key}`;
    return tTemplates.has(termKey) ? tTemplates(termKey) : t(`items.${key}`);
  };
  const enabledModules = new Set(session.modules);
  const enabledPermissions = new Set(session.permissions);

  const isSubAllowed = (subItem: NavChild) =>
    (!subItem.module || enabledModules.has(subItem.module)) &&
    (!subItem.permission || enabledPermissions.has(subItem.permission));

  const isNavAllowed = (item: NavItem) => {
    if (item.module && !enabledModules.has(item.module)) {
      return false;
    }
    if (item.permission && !enabledPermissions.has(item.permission)) {
      return false;
    }
    if (item.subItems && item.subItems.length > 0) {
      return item.subItems.some(isSubAllowed);
    }
    return true;
  };

  const visibleNavItems = applyTemplateNav(mainNavItems, template, {
    isItemVisible: isNavAllowed,
    isChildVisible: isSubAllowed,
  });
  const visibleOthersItems = otherNavItems.filter(isNavAllowed);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "support" | "others",
  ) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={nav.key}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              aria-expanded={
                openSubmenu?.type === menuType && openSubmenu?.index === index
              }
              aria-haspopup="menu"
              className={cn(
                "group menu-item cursor-pointer",
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive",
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start",
              )}
            >
              <span
                className={cn(
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive",
                )}
              >
                {nav.icon}
              </span>
              <span
                className={cn(
                  "menu-item-text",
                  isExpanded || isHovered || isMobileOpen ? "" : "sr-only",
                )}
              >
                {navLabel(nav.key)}
              </span>
              {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                <span
                  className={cn(
                    "absolute inset-e-10 ms-auto",
                    openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "menu-dropdown-badge-active"
                      : "menu-dropdown-badge-inactive",
                    "menu-dropdown-badge",
                  )}
                >
                  {t("badges.new")}
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={cn(
                    "ms-auto h-5 w-5 transition-transform duration-200",
                    openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : "",
                  )}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                target={nav.target}
                className={cn(
                  "group menu-item",
                  isActive(nav.path)
                    ? "menu-item-active"
                    : "menu-item-inactive",
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
                    isExpanded || isHovered || isMobileOpen ? "" : "sr-only",
                  )}
                >
                  {navLabel(nav.key)}
                </span>
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="ms-9 mt-2 space-y-1">
                {nav.subItems.filter(isSubAllowed).map((subItem) => (
                  <li key={subItem.key}>
                    <Link
                      href={subItem.path}
                      target={subItem.target}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {navLabel(subItem.key)}
                      <span className="ms-auto flex items-center gap-1">
                        {subItem.new && (
                          <span
                            className={`ms-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            {t("badges.new")}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "support" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    let submenuMatched = false;
    ["main", "support", "others"].forEach((menuType) => {
      const items = menuType === "main" ? mainNavItems : otherNavItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "support" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "support" | "others",
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const org = session.organization;
  const orgInitial = org.name.trim().charAt(0).toUpperCase() || "O";
  const brandLogo = org.logo;

  return (
    <aside
      inert={isDrawerHidden ? true : undefined}
      aria-hidden={isDrawerHidden ? true : undefined}
      className={`fixed top-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:mt-0 rtl:right-0 rtl:left-auto rtl:border-r-0 rtl:border-l dark:border-gray-800 dark:bg-gray-900 ${
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
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          aria-label={org.name}
        >
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              {brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={org.name}
                  width={40}
                  height={40}
                  priority
                  className="shrink-0 rounded-xl"
                  style={{ width: 40, height: 40 }}
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 font-semibold text-white">
                  {orgInitial}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                  {org.name}
                </span>
                <span className="block text-theme-xs text-gray-400">
                  {session.subscription?.planName ?? t("freePlan")}
                </span>
              </span>
            </>
          ) : brandLogo ? (
            <Image
              src={brandLogo}
              alt={org.name}
              width={32}
              height={32}
              priority
              className="shrink-0 rounded-lg"
              style={{ width: 32, height: 32 }}
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white">
              {orgInitial}
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
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.menu")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(visibleNavItems, "main")}
            </div>

            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.others")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(visibleOthersItems, "others")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
