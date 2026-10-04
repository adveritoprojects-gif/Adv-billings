"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type {
  SettingsRoleRow,
  SettingsRolesData,
} from "@/components/settings/types";
import { createRoleAction, updateRoleAction } from "@/server/actions/settings";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  role?: SettingsRoleRow | null;
  permissionGroups: SettingsRolesData["permissionGroups"];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function RoleFormModal({
  isOpen,
  onClose,
  mode,
  role,
  permissionGroups,
}: RoleFormModalProps) {
  const t = useTranslations();
  const tSettings = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [name, setName] = useState(role?.name ?? "");
  const [roleKey, setRoleKey] = useState(role?.key ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissions ?? []),
  );

  const togglePermission = (key: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorKey(null);
    const formData = new FormData(form);
    formData.delete("permissionKeys");
    selected.forEach((key) => formData.append("permissionKeys", key));
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRoleAction(formData)
          : await updateRoleAction(formData);
      if (result.ok) {
        onClose();
      } else if (result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-146 p-5 lg:p-10"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-title-sm font-semibold text-gray-900 dark:text-white/90">
          {mode === "create"
            ? tSettings("roles.createTitle")
            : tSettings("roles.editTitle")}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M17.7071 6.70712C18.0976 6.3166 18.0976 5.68344 17.7071 5.29292C17.3166 4.9024 16.6834 4.9024 16.2929 5.29292L12 9.58584L7.70712 5.29292C7.3166 4.9024 6.68344 4.9024 6.29292 5.29292C5.9024 5.68344 5.9024 6.3166 6.29292 6.70712L10.5858 11L6.29292 15.29292C5.9024 15.6834 5.9024 16.3166 6.29292 16.7071C6.68344 17.0976 7.3166 17.0976 7.70712 16.7071L12 12.4142L16.2929 16.7071C16.6834 17.0976 17.3166 17.0976 17.7071 16.7071C18.0976 16.3166 18.0976 15.6834 17.7071 15.29292L13.4142 11L17.7071 6.70712Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {errorKey ? (
          <div
            role="alert"
            className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
          >
            {t(errorKey)}
          </div>
        ) : null}

        {mode === "edit" && role ? (
          <input type="hidden" name="roleId" value={role.id} />
        ) : null}

        <div>
          <Label htmlFor="settings-role-name">
            {tSettings("roles.roleName")}
          </Label>
          <Input
            id="settings-role-name"
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (mode === "create") {
                setRoleKey(slugify(nextName));
              }
            }}
            disabled={isPending}
            required
          />
        </div>

        {mode === "create" ? (
          <div>
            <Label htmlFor="settings-role-key">
              {tSettings("roles.roleKey")}
            </Label>
            <Input
              id="settings-role-key"
              name="key"
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
              placeholder="content-reviewer"
              disabled={isPending}
              required
            />
            <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
              {tSettings("roles.roleKeyHint")}
            </p>
          </div>
        ) : null}

        <div className="space-y-5">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {tSettings("roles.permissions")}
          </p>
          {permissionGroups.map((group) => (
            <div key={group.group}>
              <p className="mb-2 text-theme-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {tSettings(`permissionGroups.${group.group}`)}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.permissions.map((permission) => (
                  <div key={permission.key}>
                    <Checkbox
                      checked={selected.has(permission.key)}
                      onChange={(checked) =>
                        togglePermission(permission.key, checked)
                      }
                      disabled={isPending}
                      label={permission.name}
                    />
                    <p className="ms-8 text-theme-xs text-gray-400 dark:text-gray-500">
                      {permission.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {tSettings("users.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "…" : tSettings("roles.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
