"use client";

import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { UserIcon } from "@/icons";
import {
  changeMemberRoleAction,
  removeMemberAction,
} from "@/server/actions/settings";
import type { SettingsMembersData } from "@/components/settings/types";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import AddMemberModal from "./AddMemberModal";

interface UsersTableProps {
  data: SettingsMembersData;
  canManage: boolean;
}

export default function UsersTable({ data, canManage }: UsersTableProps) {
  const t = useTranslations();
  const tSettings = useTranslations("settings");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (memberId: string, roleKey: string) => {
    setErrorKey(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("memberId", memberId);
      formData.set("roleKey", roleKey);
      const result = await changeMemberRoleAction(formData);
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
        setVersion((current) => current + 1);
      }
    });
  };

  const handleRemove = (memberId: string) => {
    setErrorKey(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("memberId", memberId);
      const result = await removeMemberAction(formData);
      if (result.ok) {
        setConfirmRemoveId(null);
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSettings("users.existingUserNote")}
        </p>
        {canManage ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
          >
            {tSettings("users.add")}
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

      {data.members.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSettings("users.noUsers")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSettings("users.name")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSettings("users.role")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSettings("users.status")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSettings("users.joined")}
                </th>
                {canManage ? (
                  <th className="pb-3 text-end font-medium text-gray-500 dark:text-gray-400">
                    {tSettings("users.actions")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="py-3 pe-4">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {member.name ? (
                            <span className="text-sm font-medium">
                              {member.name.trim().charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <UserIcon />
                          )}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-800 dark:text-white/90">
                          {member.name}
                        </span>
                        <span className="block truncate text-theme-xs text-gray-400">
                          {member.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pe-4">
                    {canManage ? (
                      <select
                        key={`${member.id}-${version}`}
                        defaultValue={member.roleKey}
                        onChange={(event) =>
                          handleRoleChange(member.id, event.target.value)
                        }
                        disabled={isPending}
                        aria-label={tSettings("users.role")}
                        className="h-9 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 pe-8 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                      >
                        {data.roleOptions.map((role) => (
                          <option
                            key={`${role.isSystem ? "s" : "c"}-${role.key}`}
                            value={role.key}
                            className="text-gray-700 dark:bg-gray-900"
                          >
                            {role.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {member.roleName}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pe-4">
                    <Badge
                      color={member.status === "ACTIVE" ? "success" : "warning"}
                      size="sm"
                    >
                      {tSettings(`users.statuses.${member.status}`)}
                    </Badge>
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  {canManage ? (
                    <td className="py-3 text-end">
                      {confirmRemoveId === member.id ? (
                        <span className="flex items-center justify-end gap-2">
                          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                            {tSettings("users.removeConfirm", {
                              email: member.email,
                            })}
                          </span>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemove(member.id)}
                            disabled={isPending}
                          >
                            {tSettings("users.remove")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmRemoveId(null)}
                            disabled={isPending}
                          >
                            {tSettings("users.cancel")}
                          </Button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(member.id)}
                          className="text-sm text-error-500 hover:text-error-600 dark:text-error-400"
                        >
                          {tSettings("users.remove")}
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roleOptions={data.roleOptions}
      />
    </>
  );
}
