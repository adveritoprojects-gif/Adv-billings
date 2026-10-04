"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { addMemberAction } from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

export interface RoleOption {
  key: string;
  name: string;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  roleOptions: RoleOption[];
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  roleOptions,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorKey(null);
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await addMemberAction(organizationId, formData);
      if (result.ok) {
        setErrorKey(null);
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
          {tSa("detail.users.addModal.title")}
        </h4>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {errorKey ? (
          <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {t(errorKey)}
          </div>
        ) : null}

        <div>
          <Label htmlFor="sa-member-email">
            {tSa("detail.users.addModal.email")}
          </Label>
          <Input type="email" id="sa-member-email" name="email" required />
        </div>

        <div>
          <Label htmlFor="sa-member-name">
            {tSa("detail.users.addModal.name")}
          </Label>
          <Input type="text" id="sa-member-name" name="name" />
          <p className="mt-1 text-theme-xs text-gray-400">
            {tSa("detail.users.addModal.nameHint")}
          </p>
        </div>

        <div>
          <Label htmlFor="sa-member-password">
            {tSa("detail.users.addModal.password")}
          </Label>
          <Input type="password" id="sa-member-password" name="password" />
          <p className="mt-1 text-theme-xs text-gray-400">
            {tSa("detail.users.addModal.passwordHint")}
          </p>
        </div>

        <div>
          <Label htmlFor="sa-member-role">
            {tSa("detail.users.addModal.role")}
          </Label>
          <select
            id="sa-member-role"
            name="roleKey"
            defaultValue="viewer"
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {roleOptions.map((role) => (
              <option
                key={role.key}
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
            {tSa("detail.users.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {tSa("detail.users.addModal.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMemberModal;
