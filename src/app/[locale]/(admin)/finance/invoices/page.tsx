import ModulePage from "@/components/common/ModulePage";
import { FileIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function InvoicesPage() {
  await requirePageModule("finance", PERMISSIONS.INVOICES_READ);
  return <ModulePage labelKey="invoices" icon={<FileIcon />} />;
}
