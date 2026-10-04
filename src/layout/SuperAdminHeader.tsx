"use client";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useSidebar } from "@/context/SidebarContext";
import { useSession } from "@/context/SessionContext";
import { Link, useRouter } from "@/i18n/navigation";
import { signOut } from "@/server/actions/auth";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useTransition } from "react";

const SuperAdminHeader: React.FC = () => {
  const t = useTranslations("superAdmin");
  const session = useSession();
  const router = useRouter();
  const [isSigningOut, startSignOutTransition] = useTransition();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const handleSignOut = () => {
    startSignOutTransition(async () => {
      await signOut();
      router.replace("/signin");
    });
  };

  const avatarSrc = session.user.avatarUrl ?? "/images/user/owner.png";

  return (
    <header className="sticky top-0 z-99999 flex w-full items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 md:px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className={`z-99999 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 lg:h-11 lg:w-11 dark:border-gray-800 dark:text-gray-400 ${
            isMobileOpen ? "bg-gray-100 dark:bg-white/3" : ""
          }`}
          onClick={handleToggle}
          aria-label={t("brand.name")}
        >
          <svg
            className="rtl:-scale-x-100"
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25H14.6666C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75H1.33325C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75H7.99992C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25H1.33325ZM5.25 1C5.25 0.585786 5.58579 0.25 6 0.25C6.41421 0.25 6.75 0.585786 6.75 1V11C6.75 11.4142 6.41421 11.75 6 11.75C5.58579 11.75 5.25 11.4142 5.25 11V1Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <Link
          href="/super-admin"
          className="flex min-w-0 items-center gap-2 xl:hidden"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white">
            {t("brand.name").charAt(0)}
          </span>
          <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
            {t("brand.name")}
          </span>
        </Link>
        <span className="hidden truncate text-sm font-semibold text-gray-800 xl:inline dark:text-white/90">
          {t("brand.name")}
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggleButton />
        <div className="hidden items-center gap-2.5 sm:flex">
          <span className="h-9 w-9 overflow-hidden rounded-full">
            <Image
              width={36}
              height={36}
              src={avatarSrc}
              alt={session.user.name}
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {session.user.name}
            </span>
            <span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {t("brand.tagline")}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            "flex h-9 items-center justify-center rounded-lg border border-gray-200 px-3 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5",
            "disabled:cursor-not-allowed disabled:opacity-70",
          )}
        >
          {t("header.signOut")}
        </button>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
