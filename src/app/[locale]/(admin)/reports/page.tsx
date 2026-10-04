import ModulePage from "@/components/common/ModulePage";
import { PieChartIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function ReportsPage() {
  await requirePageModule("reports", PERMISSIONS.REPORTS_READ);
  return <ModulePage labelKey="reports" icon={<PieChartIcon />} />;
}
