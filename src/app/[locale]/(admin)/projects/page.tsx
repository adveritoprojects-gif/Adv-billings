import ModulePage from "@/components/common/ModulePage";
import { FolderIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function ProjectsPage() {
  await requirePageModule("projects", PERMISSIONS.PROJECTS_READ);
  return <ModulePage labelKey="projects" icon={<FolderIcon />} />;
}
