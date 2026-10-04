import ModulePage from "@/components/common/ModulePage";
import { UserIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function StudentsPage() {
  const ctx = await requirePageModule("students", PERMISSIONS.STUDENTS_READ);
  return (
    <ModulePage
      labelKey="students"
      icon={<UserIcon />}
      templateKey={ctx.organization.templateKey}
    />
  );
}
