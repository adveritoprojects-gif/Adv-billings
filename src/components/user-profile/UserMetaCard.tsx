"use client";

import { useSession } from "@/context/SessionContext";
import { PencilIcon } from "@/icons";
import { useModal } from "../../hooks/useModal";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  return { first, last };
}

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const session = useSession();
  const { first, last } = splitName(session.user.name);
  const initial = (first || session.user.email).charAt(0).toUpperCase();

  const handleSave = () => {
    closeModal();
  };

  const fields: { label: string; value: string }[] = [
    { label: "First name", value: first || "—" },
    { label: "Last name", value: last || "—" },
    { label: "Email address", value: session.user.email },
    { label: "Role", value: session.role.name },
  ];

  return (
    <>
      <div className="mb-6 rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
        <div className="flex flex-col gap-5 sm:flex-row xl:gap-10">
          <div className="flex-1">
            <div className="mb-4 flex flex-col gap-5 sm:flex-row lg:mb-6 xl:items-center xl:justify-between">
              <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center lg:gap-6">
                {session.user.avatarUrl ? (
                  <img
                    src={session.user.avatarUrl}
                    alt={session.user.name}
                    className="size-20 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-500 text-title-md font-semibold text-white">
                    {initial}
                  </span>
                )}
                <div className="text-start">
                  <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                    {session.user.name}
                  </h4>
                  <div className="flex items-center gap-1 sm:gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session.role.name}
                    </p>
                    <div className="hidden h-3.5 w-px bg-gray-300 sm:block dark:bg-gray-700"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session.organization.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-11 xl:gap-y-7">
              {fields.map((field) => (
                <div key={field.label} className="w-full">
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    {field.label}
                  </p>
                  <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <button
              onClick={openModal}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              <PencilIcon className="size-5" />
              Edit
            </button>
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="m-4 max-w-[700px]">
        <div className="relative no-scrollbar w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900">
          <div className="px-2 pe-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
              Review the details linked to your account.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2 lg:col-span-1">
                  <Label>First Name</Label>
                  <Input type="text" defaultValue={first} readOnly />
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Last Name</Label>
                  <Input type="text" defaultValue={last} readOnly />
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Email Address</Label>
                  <Input type="email" defaultValue={session.user.email} readOnly />
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Role</Label>
                  <Input type="text" defaultValue={session.role.name} readOnly />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Done
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
