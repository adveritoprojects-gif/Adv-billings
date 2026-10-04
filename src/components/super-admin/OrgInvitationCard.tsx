import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import ResendInvitationButton from "@/components/super-admin/ResendInvitationButton";
import { getLocale, getTranslations } from "next-intl/server";

import type { InvitationState } from "./invitationState";

const STATE_COLORS: Record<InvitationState, "warning" | "success" | "light"> = {
  pending: "warning",
  accepted: "success",
  expired: "light",
  revoked: "light",
  none: "light",
};

interface OrgInvitationCardProps {
  organizationId: string;
  email: string | null;
  state: InvitationState;
  expiresAt: Date | null;
}

const OrgInvitationCard: React.FC<OrgInvitationCardProps> = async ({
  organizationId,
  email,
  state,
  expiresAt,
}) => {
  const t = await getTranslations("superAdmin.detail.invitation");
  const locale = await getLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    ...(email
      ? [{ label: t("email"), value: email as React.ReactNode }]
      : []),
    ...(expiresAt && state === "pending"
      ? [
          {
            label: t("expires"),
            value: dateFormat.format(expiresAt) as React.ReactNode,
          },
        ]
      : []),
  ];

  return (
    <ComponentCard title={t("title")}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge color={STATE_COLORS[state]} size="sm">
          {t(`statuses.${state}`)}
        </Badge>
        {state === "none" ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("missingNote")}
          </p>
        ) : null}
      </div>

      {email ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-theme-xs text-gray-400">{row.label}</dt>
              <dd className="mt-1 text-sm font-medium break-words text-gray-800 dark:text-white/90">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {state === "accepted" ? (
        <p className="text-theme-xs text-gray-400">{t("acceptedNote")}</p>
      ) : null}

      {email && state === "pending" ? (
        <div className="flex justify-start">
          <ResendInvitationButton organizationId={organizationId} />
        </div>
      ) : null}
    </ComponentCard>
  );
};

export default OrgInvitationCard;
