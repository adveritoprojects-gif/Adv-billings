"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { CrmActionResult } from "@/components/crm/types";

export interface CrmFormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "url" | "textarea" | "select" | "number" | "datetime-local";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  full?: boolean;
}

interface CrmFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: CrmFormField[];
  submitLabel: string;
  onSubmit: (formData: FormData) => Promise<CrmActionResult>;
  onSaved?: (result: CrmActionResult) => void;
}

export default function CrmFormModal({
  isOpen,
  onClose,
  title,
  fields,
  submitLabel,
  onSubmit,
  onSaved,
}: CrmFormModalProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setErrorKey(null);
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.ok) {
        onSaved?.(result);
        onClose();
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const handleClose = () => {
    if (isPending) return;
    setErrorKey(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-146 p-5 lg:p-10">
      <form onSubmit={handleSubmit}>
        <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
          {title}
        </h4>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className={field.full || field.type === "textarea" ? "col-span-1 sm:col-span-2" : "col-span-1"}
            >
              <Label htmlFor={field.name}>
                {field.label}
                {field.required ? " *" : ""}
              </Label>
              {field.type === "textarea" ? (
                <TextArea
                  name={field.name}
                  id={field.name}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  rows={3}
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  id={field.name}
                  defaultValue={field.defaultValue ?? ""}
                  required={field.required}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  {!field.required && (
                    <option value="" className="text-gray-700 dark:bg-gray-900">
                      —
                    </option>
                  )}
                  {(field.options ?? []).map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="text-gray-700 dark:bg-gray-900"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type}
                  name={field.name}
                  id={field.name}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        {errorKey ? (
          <div className="mt-5 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {t(errorKey)}
          </div>
        ) : null}

        <div className="mt-6 flex w-full items-center justify-end gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {t("crm.common.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("crm.common.saving") : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
