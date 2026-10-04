"use client";

import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { UserIcon } from "@/icons";
import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/server/actions/super-admin";
import type { OrganizationListMember } from "@/server/services/super-admin";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, useTransition } from "react";
import AddMemberModal, { type RoleOption } from "./AddMemberModal";
import { memberStatusColor } from "./statusBadge";

interface OrgUsersCardProps {
  organizationId: string;
  members: OrganizationListMember[];
  roleOptions: RoleOption[];
}

const OrgUsersCard: React.FC<OrgUsersCardProps> = ({
  organizationId,
  members,
  roleOptions,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (memberId: string, roleKey: string) => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction(
        organizationId,
        memberId,
        roleKey,
      );
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const handleRemove = (memberId: string) => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await removeMemberAction(organizationId, memberId);
      if (result.ok) {
        setConfirmRemoveId(null);
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSa("detail.users.description")}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
        >
          {tSa("detail.users.add")}
        </Button>
      </div>

      {errorKey ? (
        <div className="mb-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {t(errorKey)}
        </div>
      ) : null}

      {members.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSa("detail.users.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("detail.users.columns.user")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("detail.users.columns.role")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("detail.users.columns.status")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("detail.users.columns.joined")}
                </th>
                <th className="pb-3 text-end font-medium text-gray-500 dark:text-gray-400">
                  {tSa("detail.users.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="py-3 pe-4">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                        {member.avatarUrl ? (
                          <Image
                            width={36}
                            height={36}
                            src={member.avatarUrl}
                            alt={member.name}
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <UserIcon />
                          </span>
                        )}
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
                    <select
                      value={member.roleKey}
                      onChange={(event) =>
                        handleRoleChange(member.id, event.target.value)
                      }
                      disabled={isPending}
                      aria-label={tSa("detail.users.columns.role")}
                      className="h-9 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 pe-8 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                    >
                      {roleOptions.map((role) => (
                        <option
                          key={role.key}
                          value={role.key}
                          className="text-gray-700 dark:bg-gray-900"
                        >
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pe-4">
                    <Badge color={memberStatusColor(member.status)} size="sm">
                      {tSa(`detail.users.statuses.${member.status}`)}
                    </Badge>
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-end">
                    {confirmRemoveId === member.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {tSa("detail.users.removeDescription", {
                            email: member.email,
                          })}
                        </span>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemove(member.id)}
                          disabled={isPending}
                        >
                          {tSa("detail.users.remove")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRemoveId(null)}
                          disabled={isPending}
                        >
                          {tSa("detail.users.cancel")}
                        </Button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(member.id)}
                        className="text-sm text-error-500 hover:text-error-600 dark:text-error-400"
                      >
                        {tSa("detail.users.remove")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        organizationId={organizationId}
        roleOptions={roleOptions}
      />
    </>
  );
};

export default OrgUsersCard;
