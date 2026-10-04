"use client";

import Button from "@/components/ui/button/Button";
import { resendInvitationAction } from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface ResendInvitationButtonProps {
  organizationId: string;
}

const ResendInvitationButton: React.FC<ResendInvitationButtonProps> = ({
  organizationId,
}) => {
  const t = useTranslations();
  const tI = useTranslations("superAdmin.invitation");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleClick = () => {
    setSent(false);
    setErrorKey(null);
    startTransition(async () => {
      const result = await resendInvitationAction(organizationId);
      if (result.ok) {
        setSent(true);
        return;
      }
      setErrorKey(result.errorKey ?? "superAdmin.errors.inviteFailed");
    });
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleClick}
          disabled={isPending}
        >
          {isPending ? tI("resending") : tI("resend")}
        </Button>
      </div>
      {sent ? (
        <p className="text-theme-xs text-success-600 dark:text-success-400">
          {tI("resendSuccess")}
        </p>
      ) : null}
      {errorKey ? (
        <p className="text-theme-xs text-error-600 dark:text-error-400">
          {t(errorKey)}
        </p>
      ) : null}
    </div>
  );
};

export default ResendInvitationButton;
