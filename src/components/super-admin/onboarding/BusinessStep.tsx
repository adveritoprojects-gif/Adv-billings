import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useTranslations } from "next-intl";
import type { WizardState } from "./types";

interface BusinessStepProps {
  value: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const BusinessStep: React.FC<BusinessStepProps> = ({ value, onChange }) => {
  const tO = useTranslations("superAdmin.onboarding");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tO("business.description")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="wiz-name">{tO("business.name")}</Label>
          <Input
            id="wiz-name"
            value={value.name}
            onChange={(event) => {
              const name = event.target.value;
              onChange({
                name,
                ...(value.slugTouched ? {} : { slug: slugify(name) }),
              });
            }}
          />
        </div>
        <div>
          <Label htmlFor="wiz-slug">{tO("business.slug")}</Label>
          <Input
            id="wiz-slug"
            value={value.slug}
            onChange={(event) =>
              onChange({
                slug: slugify(event.target.value),
                slugTouched: true,
              })
            }
          />
          <p className="mt-1 text-theme-xs text-gray-400">
            {tO("business.slugHint")}
          </p>
        </div>
        <div>
          <Label htmlFor="wiz-business-type">
            {tO("business.businessType")}
          </Label>
          <Input
            id="wiz-business-type"
            value={value.businessType}
            onChange={(event) => onChange({ businessType: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="wiz-email">{tO("business.email")}</Label>
          <Input
            id="wiz-email"
            type="email"
            value={value.email}
            onChange={(event) => onChange({ email: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="wiz-phone">{tO("business.phone")}</Label>
          <Input
            id="wiz-phone"
            type="tel"
            value={value.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="wiz-website">{tO("business.website")}</Label>
          <Input
            id="wiz-website"
            type="url"
            placeholder="https://example.com"
            value={value.website}
            onChange={(event) => onChange({ website: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="wiz-address">{tO("business.address")}</Label>
          <Input
            id="wiz-address"
            value={value.address}
            onChange={(event) => onChange({ address: event.target.value })}
          />
        </div>
      </div>
      <p className="text-theme-xs text-gray-400">{tO("safety")}</p>
    </div>
  );
};

export default BusinessStep;
