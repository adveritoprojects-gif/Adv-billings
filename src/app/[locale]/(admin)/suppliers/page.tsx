import ModulePage from "@/components/common/ModulePage";
import { GroupIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function SuppliersPage() {
  const ctx = await requirePageModule("suppliers", PERMISSIONS.SUPPLIERS_READ);
  return (
    <ModulePage
      labelKey="suppliers"
      icon={<GroupIcon />}
      templateKey={ctx.organization.templateKey}
    />
  );
}
