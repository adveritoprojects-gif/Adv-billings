"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { SettingsRoleOption } from "@/components/settings/types";
import { addMemberAction } from "@/server/actions/settings";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleOptions: SettingsRoleOption[];
}

export default function AddMemberModal({
  isOpen,
  onClose,
  roleOptions,
}: AddMemberModalProps) {
  const t = useTranslations();
  const tSettings = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorKey(null);
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await addMemberAction(formData);
      if (result.ok) {
        onClose();
        form.reset();
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const handleClose = () => {
    setErrorKey(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-146 p-5 lg:p-10"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-title-sm font-semibold text-gray-900 dark:text-white/90">
          {tSettings("users.addTitle")}
        </h4>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {errorKey ? (
          <div
            role="alert"
            className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
          >
            {t(errorKey)}
          </div>
        ) : null}

        <div>
          <Label htmlFor="settings-member-name">
            {tSettings("users.name")}
          </Label>
          <Input
            id="settings-member-name"
            name="name"
            placeholder="Jane Doe"
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="settings-member-email">
            {tSettings("users.email")}
          </Label>
          <Input
            id="settings-member-email"
            name="email"
            type="email"
            placeholder="jane@company.com"
            disabled={isPending}
            required
          />
        </div>
        <div>
          <Label htmlFor="settings-member-password">
            {tSettings("users.password")}
          </Label>
          <Input
            id="settings-member-password"
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={isPending}
          />
          <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {tSettings("users.passwordHint")}
          </p>
        </div>
        <div>
          <Label htmlFor="settings-member-role">
            {tSettings("users.role")}
          </Label>
          <select
            id="settings-member-role"
            name="roleKey"
            defaultValue="viewer"
            disabled={isPending}
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {roleOptions.map((role) => (
              <option
                key={`${role.isSystem ? "s" : "c"}-${role.key}`}
                value={role.key}
                className="text-gray-700 dark:bg-gray-900"
              >
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {tSettings("users.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "…" : tSettings("users.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
