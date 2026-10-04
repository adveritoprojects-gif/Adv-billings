"use client";

import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { SettingsRoleRow, SettingsRolesData } from "@/components/settings/types";
import { deleteRoleAction } from "@/server/actions/settings";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import RoleFormModal from "./RoleFormModal";

interface RolesTableProps {
  data: SettingsRolesData;
  canManage: boolean;
}

export default function RolesTable({ data, canManage }: RolesTableProps) {
  const t = useTranslations();
  const tSettings = useTranslations("settings");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<SettingsRoleRow | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (roleId: string) => {
    setErrorKey(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("roleId", roleId);
      const result = await deleteRoleAction(formData);
      if (result.ok) {
        setConfirmDeleteId(null);
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const customRoles = data.roles.filter((role) => !role.isSystem);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSettings("roles.noPermissionsNote")}
        </p>
        {canManage ? (
          <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
            {tSettings("roles.create")}
          </Button>
        ) : null}
      </div>

      {errorKey ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        >
          {t(errorKey)}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                {tSettings("roles.roleName")}
              </th>
              <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                {tSettings("roles.type")}
              </th>
              <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                {tSettings("roles.members")}
              </th>
              <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                {tSettings("roles.permissions")}
              </th>
              {canManage ? (
                <th className="pb-3 text-end font-medium text-gray-500 dark:text-gray-400">
                  {tSettings("users.actions")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.roles.map((role) => (
              <tr
                key={role.id}
                className="border-b border-gray-100 last:border-0 dark:border-gray-800"
              >
                <td className="py-3 pe-4">
                  <span className="block font-medium text-gray-800 dark:text-white/90">
                    {role.name}
                  </span>
                  <span className="block text-theme-xs text-gray-400">
                    {role.key}
                  </span>
                </td>
                <td className="py-3 pe-4">
                  <Badge
                    color={role.isSystem ? "primary" : "light"}
                    size="sm"
                  >
                    {role.isSystem
                      ? tSettings("roles.system")
                      : tSettings("roles.custom")}
                  </Badge>
                </td>
                <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                  {role.memberCount}
                </td>
                <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                  {role.permissions.length}
                </td>
                {canManage ? (
                  <td className="py-3 text-end">
                    {!role.isSystem ? (
                      confirmDeleteId === role.id ? (
                        <span className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(role.id)}
                            disabled={isPending}
                          >
                            {tSettings("roles.delete")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isPending}
                          >
                            {tSettings("users.cancel")}
                          </Button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingRole(role)}
                            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                          >
                            {tSettings("roles.editTitle")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(role.id)}
                            className="text-sm text-error-500 hover:text-error-600 dark:text-error-400"
                          >
                            {tSettings("roles.delete")}
                          </button>
                        </span>
                      )
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {customRoles.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {tSettings("roles.empty")}
        </p>
      ) : null}

      <RoleFormModal
        key="create-role"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        permissionGroups={data.permissionGroups}
      />
      <RoleFormModal
        key={`edit-role-${editingRole?.id ?? "none"}`}
        isOpen={editingRole !== null}
        onClose={() => setEditingRole(null)}
        mode="edit"
        role={editingRole}
        permissionGroups={data.permissionGroups}
      />
    </>
  );
}
