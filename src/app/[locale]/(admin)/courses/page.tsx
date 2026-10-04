import ModulePage from "@/components/common/ModulePage";
import { DocsIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function CoursesPage() {
  const ctx = await requirePageModule("courses", PERMISSIONS.COURSES_READ);
  return (
    <ModulePage
      labelKey="courses"
      icon={<DocsIcon />}
      templateKey={ctx.organization.templateKey}
    />
  );
}
