import ModulePage from "@/components/common/ModulePage";
import { TaskIcon } from "@/icons";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export default async function TasksPage() {
  await requirePageModule("tasks", PERMISSIONS.TASKS_READ);
  return <ModulePage labelKey="tasks" icon={<TaskIcon />} />;
}
