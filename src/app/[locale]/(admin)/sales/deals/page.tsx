import ModulePage from "@/components/common/ModulePage";
import { DollarLineIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function DealsPage() {
  await requirePageModule("sales", PERMISSIONS.DEALS_READ);
  return <ModulePage labelKey="deals" icon={<DollarLineIcon />} />;
}
