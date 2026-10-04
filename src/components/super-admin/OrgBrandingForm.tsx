"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { updateBrandingAction } from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface OrgBrandingFormProps {
  organizationId: string;
  defaults: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
  };
}

const OrgBrandingForm: React.FC<OrgBrandingFormProps> = ({
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
      const result = await updateBrandingAction(organizationId, formData);
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
    type: string;
  }> = [
    {
      id: "sa-branding-primary",
      label: tSa("detail.branding.primaryColor"),
      name: "primaryColor",
      defaultValue: defaults.primaryColor,
      type: "text",
    },
    {
      id: "sa-branding-secondary",
      label: tSa("detail.branding.secondaryColor"),
      name: "secondaryColor",
      defaultValue: defaults.secondaryColor,
      type: "text",
    },
    {
      id: "sa-branding-logo",
      label: tSa("detail.branding.logo"),
      name: "logo",
      defaultValue: defaults.logo,
      type: "url",
    },
    {
      id: "sa-branding-favicon",
      label: tSa("detail.branding.favicon"),
      name: "favicon",
      defaultValue: defaults.favicon,
      type: "url",
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
              type={field.type}
              id={field.id}
              name={field.name}
              defaultValue={field.defaultValue}
              placeholder={field.name.includes("Color") ? "#465fff" : undefined}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {tSa("detail.branding.save")}
        </Button>
      </div>
    </form>
  );
};

export default OrgBrandingForm;
