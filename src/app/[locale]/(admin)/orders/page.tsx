import ModulePage from "@/components/common/ModulePage";
import { ListIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function OrdersPage() {
  const ctx = await requirePageModule("orders", PERMISSIONS.ORDERS_READ);
  return (
    <ModulePage
      labelKey="orders"
      icon={<ListIcon />}
      templateKey={ctx.organization.templateKey}
    />
  );
}
