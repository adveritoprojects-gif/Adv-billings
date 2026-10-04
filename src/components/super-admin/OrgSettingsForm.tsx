"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { updateOrganizationAction } from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface OrgSettingsFormProps {
  organizationId: string;
  defaults: {
    name: string;
    slug: string;
    businessType: string;
    timezone: string;
    currency: string;
    dateFormat: string;
  };
}

const OrgSettingsForm: React.FC<OrgSettingsFormProps> = ({
  organizationId,
  defaults,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateOrganizationAction(organizationId, formData);
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const fields: Array<{
    id: string;
    label: string;
    name: string;
    defaultValue: string;
  }> = [
    {
      id: "sa-settings-name",
      label: tSa("detail.settings.name"),
      name: "name",
      defaultValue: defaults.name,
    },
    {
      id: "sa-settings-slug",
      label: tSa("detail.settings.slug"),
      name: "slug",
      defaultValue: defaults.slug,
    },
    {
      id: "sa-settings-business-type",
      label: tSa("detail.settings.businessType"),
      name: "businessType",
      defaultValue: defaults.businessType,
    },
    {
      id: "sa-settings-timezone",
      label: tSa("detail.settings.timezone"),
      name: "timezone",
      defaultValue: defaults.timezone,
    },
    {
      id: "sa-settings-currency",
      label: tSa("detail.settings.currency"),
      name: "currency",
      defaultValue: defaults.currency,
    },
    {
      id: "sa-settings-date-format",
      label: tSa("detail.settings.dateFormat"),
      name: "dateFormat",
      defaultValue: defaults.dateFormat,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorKey ? (
        <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {t(errorKey)}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id}>
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              type="text"
              id={field.id}
              name={field.name}
              defaultValue={field.defaultValue}
              required={field.name === "name" || field.name === "slug"}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {tSa("detail.settings.save")}
        </Button>
      </div>
    </form>
  );
};

export default OrgSettingsForm;
