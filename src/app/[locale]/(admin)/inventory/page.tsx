import ModulePage from "@/components/common/ModulePage";
import { TableIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function InventoryPage() {
  const ctx = await requirePageModule("inventory", PERMISSIONS.INVENTORY_READ);
  return (
    <ModulePage
      labelKey="inventory"
      icon={<TableIcon />}
      templateKey={ctx.organization.templateKey}
    />
  );
}
