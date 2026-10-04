import ModulePage from "@/components/common/ModulePage";
import { BoxIconLine } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function ExpensesPage() {
  await requirePageModule("finance", PERMISSIONS.EXPENSES_READ);
  return <ModulePage labelKey="expenses" icon={<BoxIconLine />} />;
}
