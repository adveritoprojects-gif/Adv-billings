import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import Badge from "@/components/ui/badge/Badge";
import { stateBadgeColor, stateLabelKey } from "@/components/billing/states";
import { useSession } from "@/context/SessionContext";

export default function SidebarWidget() {
  const t = useTranslations("sidebar");
  const tBilling = useTranslations("billing");
  const session = useSession();
  const planName = session.subscription?.planName ?? t("freePlan");
  const state = session.subscription?.state ?? null;

  return (
    <div className="pb-20">
      <div
        className="
        mx-auto  rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/3"
      >
        <span className="mb-2 inline-flex items-center gap-1.5">
          <Badge color="primary" size="sm">
            {planName}
          </Badge>
          <Badge color={stateBadgeColor(state)} size="sm">
            {tBilling(stateLabelKey(state))}
          </Badge>
        </span>
        <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
          {session.organization.name}
        </h3>
        <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
          {t("widget.description", { plan: planName })}
        </p>
        <Link
          href="/billing"
          className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600"
        >
          {t("widget.manage")}
        </Link>
      </div>
    </div>
  );
}
