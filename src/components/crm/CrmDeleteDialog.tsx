"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { CrmActionResult } from "@/components/crm/types";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";

interface CrmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<CrmActionResult>;
}

export default function CrmDeleteDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
}: CrmDeleteDialogProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleConfirm = () => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
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
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md p-5 lg:p-8">
      <h4 className="mb-3 text-lg font-medium text-gray-800 dark:text-white/90">
        {title}
      </h4>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">{message}</p>
      {errorKey ? (
        <div className="mt-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {t(errorKey)}
        </div>
      ) : null}
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClose}
          disabled={isPending}
        >
          {t("crm.common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={isPending}
          variant="danger"
        >
          {isPending ? t("crm.common.deleting") : (confirmLabel ?? t("crm.common.delete"))}
        </Button>
      </div>
    </Modal>
  );
}
