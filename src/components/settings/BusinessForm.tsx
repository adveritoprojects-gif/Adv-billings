"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import {
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/components/settings/constants";
import type { BusinessSettings } from "@/components/settings/types";
import { updateBusinessAction } from "@/server/actions/settings";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

interface BusinessFormProps {
  initial: BusinessSettings;
  canEdit: boolean;
}

export default function BusinessForm({ initial, canEdit }: BusinessFormProps) {
  const t = useTranslations("settings");
  const [state, formAction, isPending] = useActionState(updateBusinessAction, {
    ok: false,
  });

  return (
    <form action={formAction} className="space-y-6">
      {state.errorKey ? (
        <div
          role="alert"
          className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        >
          {t(state.errorKey)}
        </div>
      ) : null}
      {state.ok ? (
        <div
          role="status"
          className="rounded-lg border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
        >
          {t("business.saved")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="business-name">{t("business.name")}</Label>
          <Input
            id="business-name"
            name="name"
            defaultValue={initial.name}
            placeholder={t("business.namePlaceholder")}
            disabled={!canEdit || isPending}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="business-slug">{t("business.slug")}</Label>
          <Input
            id="business-slug"
            name="slug"
            defaultValue={initial.slug}
            disabled
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="business-type">{t("business.businessType")}</Label>
          <Input
            id="business-type"
            name="businessType"
            defaultValue={initial.businessType ?? ""}
            placeholder={t("business.businessTypePlaceholder")}
            disabled={!canEdit || isPending}
          />
        </div>
        <div>
          <Label htmlFor="business-currency">{t("business.currency")}</Label>
          <select
            id="business-currency"
            name="currency"
            defaultValue={initial.currency ?? "USD"}
            disabled={!canEdit || isPending}
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {CURRENCY_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="business-timezone">{t("business.timezone")}</Label>
          <select
            id="business-timezone"
            name="timezone"
            defaultValue={initial.timezone ?? "UTC"}
            disabled={!canEdit || isPending}
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {TIMEZONE_OPTIONS.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="business-date-format">
            {t("business.dateFormat")}
          </Label>
          <select
            id="business-date-format"
            name="dateFormat"
            defaultValue={initial.dateFormat ?? "yyyy-MM-dd"}
            disabled={!canEdit || isPending}
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {DATE_FORMAT_OPTIONS.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "…" : t("business.save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
