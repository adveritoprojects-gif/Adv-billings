import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useTranslations } from "next-intl";
import type { WizardState } from "./types";

interface BrandingStepProps {
  value: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

const isHex = (input: string) => /^#[0-9a-fA-F]{6}$/.test(input);

const BrandingStep: React.FC<BrandingStepProps> = ({ value, onChange }) => {
  const tO = useTranslations("superAdmin.onboarding");

  const colorField = (
    id: string,
    label: string,
    field: "primaryColor" | "secondaryColor",
  ) => {
    const current = value[field];
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-3">
          <Input
            id={id}
            className="flex-1"
            placeholder="#465fff"
            value={current}
            onChange={(event) => onChange({ [field]: event.target.value })}
          />
          <input
            type="color"
            aria-label={label}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700"
            value={isHex(current) ? current : "#465fff"}
            onChange={(event) => onChange({ [field]: event.target.value })}
          />
        </div>
        <p className="mt-1 text-theme-xs text-gray-400">
          {tO("branding.colorHint")}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {tO("branding.description")}
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="wiz-logo">{tO("branding.logo")}</Label>
          <Input
            id="wiz-logo"
            type="url"
            placeholder="https://example.com/logo.png"
            value={value.logo}
            onChange={(event) => onChange({ logo: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="wiz-favicon">{tO("branding.favicon")}</Label>
          <Input
            id="wiz-favicon"
            type="url"
            placeholder="https://example.com/favicon.ico"
            value={value.favicon}
            onChange={(event) => onChange({ favicon: event.target.value })}
          />
        </div>
        {colorField(
          "wiz-primary-color",
          tO("branding.primaryColor"),
          "primaryColor",
        )}
        {colorField(
          "wiz-secondary-color",
          tO("branding.secondaryColor"),
          "secondaryColor",
        )}
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/3">
        <span className="text-theme-xs text-gray-400">
          {tO("branding.preview")}
        </span>
        <span
          className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white"
          style={{
            backgroundColor: isHex(value.primaryColor)
              ? value.primaryColor
              : "#465fff",
          }}
        >
          Aa
        </span>
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{
            backgroundColor: isHex(value.secondaryColor)
              ? value.secondaryColor
              : isHex(value.primaryColor)
                ? value.primaryColor
                : "#465fff",
          }}
        >
          A
        </span>
      </div>
    </div>
  );
};

export default BrandingStep;
