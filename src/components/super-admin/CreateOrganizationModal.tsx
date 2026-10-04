"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { INDUSTRY_TEMPLATE_KEYS } from "@/config/industry";
import { useRouter } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import { createOrganizationAction } from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const tTemplates = useTranslations("templates");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!slugTouched) {
      setSlug(slugify(event.target.value));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createOrganizationAction(formData);
      if (result.ok) {
        onClose();
        router.push(`/super-admin/organizations/${result.id}`);
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const handleClose = () => {
    setErrorKey(null);
    setSlug("");
    setSlugTouched(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-146 p-5 lg:p-10"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-title-sm font-semibold text-gray-900 dark:text-white/90">
            {tSa("organizations.createModal.title")}
          </h4>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {errorKey ? (
          <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {t(errorKey)}
          </div>
        ) : null}

        <div>
          <Label htmlFor="sa-org-name">
            {tSa("organizations.createModal.name")}
          </Label>
          <Input
            type="text"
            id="sa-org-name"
            name="name"
            required
            onChange={handleNameChange}
          />
        </div>

        <div>
          <Label htmlFor="sa-org-slug">
            {tSa("organizations.createModal.slug")}
          </Label>
          <Input
            type="text"
            id="sa-org-slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
          />
          <p className="mt-1 text-theme-xs text-gray-400">
            {tSa("organizations.createModal.slugHint")}
          </p>
        </div>

        <div>
          <Label htmlFor="sa-org-business-type">
            {tSa("organizations.createModal.businessType")}
          </Label>
          <Input type="text" id="sa-org-business-type" name="businessType" />
        </div>

        <div>
          <Label htmlFor="sa-org-template">
            {tSa("organizations.createModal.template")}
          </Label>
          <select
            id="sa-org-template"
            name="templateKey"
            defaultValue="general"
            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {INDUSTRY_TEMPLATE_KEYS.map((key) => (
              <option
                key={key}
                value={key}
                className="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                {tTemplates(`names.${key}`)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-theme-xs text-gray-400">
            {tSa("organizations.createModal.templateHint")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="sa-org-owner-name">
              {tSa("organizations.createModal.ownerName")}
            </Label>
            <Input
              type="text"
              id="sa-org-owner-name"
              name="ownerName"
              required
            />
          </div>
          <div>
            <Label htmlFor="sa-org-owner-email">
              {tSa("organizations.createModal.ownerEmail")}
            </Label>
            <Input
              type="email"
              id="sa-org-owner-email"
              name="ownerEmail"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="sa-org-owner-password">
            {tSa("organizations.createModal.ownerPassword")}
          </Label>
          <Input
            type="password"
            id="sa-org-owner-password"
            name="ownerPassword"
          />
          <p className="mt-1 text-theme-xs text-gray-400">
            {tSa("organizations.createModal.ownerHint")}
          </p>
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
          <Button type="submit" disabled={isPending} startIcon={<PlusIcon />}>
            {tSa("organizations.createModal.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateOrganizationModal;
