"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/server/actions/invitations";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

const initialState: AcceptInvitationState = {};

interface AcceptInvitationFormProps {
  token: string;
  setsPassword: boolean;
  ownerName: string;
  organizationName: string;
  expiresAt: string;
}

export default function AcceptInvitationForm({
  token,
  setsPassword,
  ownerName,
  organizationName,
  expiresAt,
}: AcceptInvitationFormProps) {
  const t = useTranslations("acceptInvitation");
  const locale = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  const expiryLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-theme-md dark:border-gray-800 dark:bg-gray-900">
        <p className="text-theme-xs font-medium tracking-wide text-brand-500 uppercase">
          Adverito
        </p>
        <h1 className="mt-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {setsPassword
            ? t("description", { ownerName, organizationName })
            : t("descriptionExisting", { ownerName, organizationName })}
        </p>
        <p className="mt-1 text-theme-xs text-gray-400">
          {t("expiresAt", { when: expiryLabel })}
        </p>

        {state.errorKey ? (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
          >
            {t(state.errorKey)}
          </div>
        ) : null}

        <form action={formAction} className="mt-6 space-y-5">
          <input type="hidden" name="token" value={token} />

          {setsPassword ? (
            <>
              <div>
                <Label htmlFor="invite-password">{t("password")}</Label>
                <div className="relative">
                  <Input
                    id="invite-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder={t("passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-500 dark:text-gray-400"
                    aria-label={
                      showPassword ? t("hidePassword") : t("showPassword")
                    }
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </button>
                </div>
                <p className="mt-1 text-theme-xs text-gray-400">
                  {t("passwordHint")}
                </p>
              </div>
              <div>
                <Label htmlFor="invite-confirm">{t("confirmPassword")}</Label>
                <Input
                  id="invite-confirm"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder={t("confirmPasswordPlaceholder")}
                />
              </div>
            </>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>

        <p className="mt-6 text-theme-xs text-gray-400">{t("supportNote")}</p>
      </div>
    </div>
  );
}
