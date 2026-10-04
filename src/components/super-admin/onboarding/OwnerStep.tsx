import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useTranslations } from "next-intl";
import type { WizardState } from "./types";

interface OwnerStepProps {
  value: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

const OwnerStep: React.FC<OwnerStepProps> = ({ value, onChange }) => {
  const tO = useTranslations("superAdmin.onboarding");

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {tO("owner.description")}
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="wiz-owner-name">{tO("owner.name")}</Label>
          <Input
            id="wiz-owner-name"
            value={value.ownerName}
            onChange={(event) => onChange({ ownerName: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="wiz-owner-email">{tO("owner.email")}</Label>
          <Input
            id="wiz-owner-email"
            type="email"
            value={value.ownerEmail}
            onChange={(event) => onChange({ ownerEmail: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <p className="text-theme-xs text-gray-400 dark:text-gray-500">
            {tO("owner.inviteHint")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerStep;
