import ModulePage from "@/components/common/ModulePage";
import { BoxIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function ProductsPage() {
  const ctx = await requirePageModule("products", PERMISSIONS.PRODUCTS_READ);
  return (
    <ModulePage
      labelKey="products"
      icon={<BoxIcon />}
      templateKey={ctx.organization.templateKey}
    />
  );
}
