"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { BrandingSettings } from "@/components/settings/types";
import { updateBrandingAction } from "@/server/actions/settings";
import {
  brandingStyle,
  resolveTenantBranding,
} from "@/utils/branding";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useActionState, useRef, useState } from "react";

interface BrandingFormProps {
  initial: BrandingSettings;
  orgName: string;
  canEdit: boolean;
}

function ImageField({
  id,
  label,
  hint,
  name,
  defaultValue,
  disabled,
  onClear,
}: {
  id: string;
  label: string;
  hint?: string;
  name: string;
  defaultValue: string;
  disabled: boolean;
  onClear: (field: string) => void;
}) {
  const t = useTranslations("settings");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          name={name}
          defaultValue={defaultValue}
          placeholder="/branding/logo.svg"
          disabled={disabled}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => onClear(name)}
          disabled={disabled}
          className="h-11 shrink-0 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-white/80 dark:hover:bg-white/5"
        >
          {t("branding.clear")}
        </button>
      </div>
      {hint ? (
        <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function BrandingForm({
  initial,
  orgName,
  canEdit,
}: BrandingFormProps) {
  const t = useTranslations("settings");
  const [state, formAction, isPending] = useActionState(
    updateBrandingAction,
    { ok: false },
  );
  const [primary, setPrimary] = useState(initial.primaryColor ?? "#465fff");
  const [secondary, setSecondary] = useState(initial.secondaryColor ?? "");

  const colorValue = (value: string) =>
    /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#465fff";

  const formRef = useRef<HTMLFormElement>(null);

  const handleClear = (field: string) => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const formData = new FormData(form);
    formData.set("clearField", field);
    formAction(formData);
  };

  const preview = resolveTenantBranding({
    name: orgName,
    logo: initial.logo || null,
    primaryColor: primary,
    secondaryColor: secondary || null,
  });
  const vars = brandingStyle(preview);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state.errorKey ? (
        <div
          role="alert"
          className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        >
          {t(state.errorKey)}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400">
          {t("branding.saved")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ImageField
            id="branding-logo"
            label={t("branding.logo")}
            hint={t("branding.logoHint")}
            name="logo"
            defaultValue={initial.logo ?? ""}
            disabled={!canEdit || isPending}
            onClear={handleClear}
          />
          <ImageField
            id="branding-favicon"
            label={t("branding.favicon")}
            name="favicon"
            defaultValue={initial.favicon ?? ""}
            disabled={!canEdit || isPending}
            onClear={handleClear}
          />
          <ImageField
            id="branding-login-logo"
            label={t("branding.loginLogo")}
            hint={t("branding.loginLogoHint")}
            name="loginLogo"
            defaultValue={initial.loginLogo ?? ""}
            disabled={!canEdit || isPending}
            onClear={handleClear}
          />
          <ImageField
            id="branding-login-background"
            label={t("branding.loginBackground")}
            hint={t("branding.loginBackgroundHint")}
            name="loginBackground"
            defaultValue={initial.loginBackground ?? ""}
            disabled={!canEdit || isPending}
            onClear={handleClear}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="branding-primary">
                {t("branding.primaryColor")}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorValue(primary)}
                  onChange={(event) => setPrimary(event.target.value)}
                  disabled={!canEdit || isPending}
                  className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700"
                  aria-label={t("branding.primaryColor")}
                />
                <Input
                  id="branding-primary"
                  name="primaryColor"
                  value={primary}
                  onChange={(event) => setPrimary(event.target.value)}
                  placeholder="#465fff"
                  disabled={!canEdit || isPending}
                  className="flex-1 uppercase"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="branding-secondary">
                {t("branding.secondaryColor")}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorValue(secondary)}
                  onChange={(event) => setSecondary(event.target.value)}
                  disabled={!canEdit || isPending}
                  className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700"
                  aria-label={t("branding.secondaryColor")}
                />
                <Input
                  id="branding-secondary"
                  name="secondaryColor"
                  value={secondary}
                  onChange={(event) => setSecondary(event.target.value)}
                  placeholder="#3541aa"
                  disabled={!canEdit || isPending}
                  className="flex-1 uppercase"
                />
              </div>
            </div>
          </div>

          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "…" : t("branding.save")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <p className="text-base font-medium text-gray-800 dark:text-white/90">
            {t("branding.preview")}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("branding.previewDesc")}
          </p>
          <div
            className="mt-5 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
            style={vars}
          >
            <div className="flex items-center gap-3">
              {preview.logo ? (
                <Image
                  src={preview.logo}
                  alt={preview.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-xl object-contain"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-base font-semibold text-white">
                  {preview.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {preview.name}
                </p>
                <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                  {preview.primaryColor.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
                {t("branding.preview")}
              </span>
              <span className="inline-flex items-center rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-500 dark:text-brand-400">
                {t("title")}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {(
                [
                  ["--brand-primary", preview.primaryColor],
                  ["--brand-secondary", preview.secondaryColor],
                  ["--brand-background", vars["--brand-background"] ?? ""],
                ] as [string, string][]
              ).map(([token, fallback]) => (
                <div key={token}>
                  <span
                    className="block h-8 rounded-lg border border-gray-200 dark:border-gray-800"
                    style={{ backgroundColor: `var(${token}, ${fallback})` }}
                  />
                  <p className="mt-1 truncate text-theme-xs uppercase text-gray-500 dark:text-gray-400">
                    {token}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
