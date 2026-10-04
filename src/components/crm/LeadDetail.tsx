"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition, type ReactNode } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import CrmDeleteDialog from "@/components/crm/CrmDeleteDialog";
import CrmFormModal, { type CrmFormField } from "@/components/crm/CrmFormModal";
import CrmInlineSelect from "@/components/crm/CrmInlineSelect";
import CrmPriorityBadge from "@/components/crm/CrmPriorityBadge";
import CrmStatusBadge from "@/components/crm/CrmStatusBadge";
import CrmUserCell from "@/components/crm/CrmUserCell";
import { formatDateTime } from "@/components/crm/format";
import {
  ACTIVITY_TYPES,
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRIORITIES,
  TASK_STATUSES,
  type CrmLeadDetail,
  type CrmMember,
} from "@/components/crm/types";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";
import { ChevronLeftIcon, PencilIcon, TrashBinIcon } from "@/icons";
import {
  addFollowUp,
  addNote,
  assignLead,
  createTask,
  deleteFollowUp,
  deleteLead,
  deleteNote,
  deleteTask,
  logCrmActivity,
  setFollowUpStatus,
  setLeadStatus,
  setTaskStatus,
  updateLead,
} from "@/server/actions/crm";

interface LeadDetailProps {
  lead: CrmLeadDetail;
  members: CrmMember[];
  canManage: boolean;
}

type DeleteTarget = { kind: "note" | "followUp" | "task"; id: string } | null;

export default function LeadDetail({ lead, members, canManage }: LeadDetailProps) {
  const t = useTranslations("crm");
  const tRoot = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => LEAD_STATUSES.map((value) => ({ value, label: t(`leadStatus.${value}`) })),
    [t],
  );
  const priorityOptions = useMemo(
    () => PRIORITIES.map((value) => ({ value, label: t(`priority.${value}`) })),
    [t],
  );
  const sourceOptions = useMemo(
    () => LEAD_SOURCES.map((value) => ({ value, label: t(`sources.${value}`) })),
    [t],
  );
  const memberOptions = useMemo(
    () => members.map((member) => ({ value: member.id, label: member.name })),
    [members],
  );
  const taskStatusOptions = useMemo(
    () => TASK_STATUSES.map((value) => ({ value, label: t(`taskStatus.${value}`) })),
    [t],
  );
  const followUpTypeOptions = useMemo(
    () =>
      FOLLOW_UP_TYPES.map((value) => ({
        value,
        label: t(`followUpType.${value}`),
      })),
    [t],
  );
  const followUpStatusOptions = useMemo(
    () =>
      FOLLOW_UP_STATUSES.map((value) => ({
        value,
        label: t(`followUpStatus.${value}`),
      })),
    [t],
  );
  const activityTypeOptions = useMemo(
    () =>
      ACTIVITY_TYPES.map((value) => ({
        value,
        label: t(`activityType.${value}`),
      })),
    [t],
  );

  const fieldValue = (formData: FormData, name: string): string => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  const editFields: CrmFormField[] = [
    {
      name: "name",
      label: t("common.name"),
      type: "text",
      required: true,
      defaultValue: lead.name,
    },
    {
      name: "email",
      label: t("common.email"),
      type: "email",
      defaultValue: lead.email ?? "",
    },
    {
      name: "value",
      label: t("form.value"),
      type: "number",
      defaultValue: lead.valueCents != null ? String(lead.valueCents / 100) : "",
    },
    {
      name: "phone",
      label: t("common.phone"),
      type: "tel",
      defaultValue: lead.phone ?? "",
    },
    {
      name: "company",
      label: t("common.company"),
      type: "text",
      defaultValue: lead.company ?? "",
    },
    {
      name: "source",
      label: t("common.source"),
      type: "select",
      options: sourceOptions,
      defaultValue: lead.source,
    },
    {
      name: "status",
      label: t("common.status"),
      type: "select",
      options: statusOptions,
      defaultValue: lead.status,
    },
    {
      name: "priority",
      label: t("common.priority"),
      type: "select",
      options: priorityOptions,
      defaultValue: lead.priority,
    },
    {
      name: "assignedToId",
      label: t("common.assignee"),
      type: "select",
      options: [{ value: "", label: t("common.unassigned") }, ...memberOptions],
      defaultValue: lead.assignedToId ?? "",
    },
    {
      name: "notes",
      label: t("common.notes"),
      type: "textarea",
      defaultValue: lead.notesText ?? "",
    },
  ];

  const followUpFields: CrmFormField[] = [
    {
      name: "type",
      label: t("detail.followUpType"),
      type: "select",
      options: followUpTypeOptions,
      defaultValue: "CALL",
    },
    {
      name: "dueAt",
      label: t("detail.followUpDue"),
      type: "datetime-local",
      required: true,
      defaultValue: "",
    },
    {
      name: "notes",
      label: t("detail.followUpNotes"),
      type: "textarea",
      full: true,
    },
  ];

  const taskFields: CrmFormField[] = [
    {
      name: "title",
      label: t("common.title"),
      type: "text",
      required: true,
      full: true,
    },
    {
      name: "status",
      label: t("common.status"),
      type: "select",
      options: taskStatusOptions,
      defaultValue: "OPEN",
    },
    {
      name: "priority",
      label: t("common.priority"),
      type: "select",
      options: priorityOptions,
      defaultValue: "MEDIUM",
    },
    {
      name: "dueAt",
      label: t("common.dueAt"),
      type: "datetime-local",
      defaultValue: "",
    },
    {
      name: "assignedToId",
      label: t("common.assignee"),
      type: "select",
      options: [{ value: "", label: t("common.unassigned") }, ...memberOptions],
      defaultValue: "",
    },
    {
      name: "description",
      label: t("common.description"),
      type: "textarea",
      full: true,
    },
  ];

  const activityFields: CrmFormField[] = [
    {
      name: "type",
      label: t("detail.logType"),
      type: "select",
      options: activityTypeOptions,
      defaultValue: "CALL",
    },
    {
      name: "subject",
      label: t("detail.logSubject"),
      type: "text",
      required: true,
      defaultValue: "",
    },
    {
      name: "description",
      label: t("detail.logDescription"),
      type: "textarea",
      full: true,
    },
  ];

  const saveNote = () => {
    setNoteError(null);
    startTransition(async () => {
      const result = await addNote("lead", lead.id, noteBody);
      if (result.ok) {
        setNoteBody("");
      } else if (result.errorKey) {
        setNoteError(result.errorKey);
      }
    });
  };

  const runAction = (action: () => Promise<{ ok: boolean; errorKey?: string }>) => {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setActionError(null);
        return;
      }
      setActionError(result.errorKey ?? "crm.errors.generic");
      router.refresh();
    });
  };

  const profileItems: { label: string; value: ReactNode }[] = [
    { label: t("common.email"), value: lead.email ?? "—" },
    { label: t("common.phone"), value: lead.phone ?? "—" },
    { label: t("common.company"), value: lead.company ?? "—" },
    { label: t("common.source"), value: t(`sources.${lead.source}`) },
    { label: t("detail.created"), value: formatDateTime(lead.createdAt) },
    { label: t("detail.updated"), value: formatDateTime(lead.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/crm/leads"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
          {t("detail.backToList")}
        </Link>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              <PencilIcon /> {t("common.edit")}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleting(true)}>
              <TrashBinIcon /> {t("common.delete")}
            </Button>
          </div>
        ) : null}
      </div>

      {actionError ? (
        <p
          role="alert"
          className="rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-500 dark:bg-error-500/15 dark:text-error-400"
        >
          {tRoot(actionError)}
        </p>
      ) : null}

      <ComponentCard title={t("detail.profile")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-title-md font-semibold text-gray-800 dark:text-white/90">
              {lead.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canManage ? (
                <CrmInlineSelect
                  value={lead.status}
                  options={statusOptions}
                  onChange={(value) =>
                    runAction(() => setLeadStatus(lead.id, value))
                  }
                  ariaLabel={`${lead.name}: ${t("common.status")}`}
                />
              ) : (
                <CrmStatusBadge entity="lead" status={lead.status} size="md" />
              )}
              <CrmPriorityBadge priority={lead.priority} size="md" />
            </div>
          </div>
          <div className="sm:w-56">
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              {t("detail.owner")}
            </p>
            <div className="mt-1.5">
              {canManage ? (
                <select
                  aria-label={`${lead.name}: ${t("detail.owner")}`}
                  value={lead.assignedToId ?? ""}
                  onChange={(event) =>
                    runAction(() =>
                      assignLead(lead.id, event.target.value || null),
                    )
                  }
                  className="h-9 w-full cursor-pointer rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-700 hover:border-brand-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="" className="dark:bg-gray-900">
                    {t("common.unassigned")}
                  </option>
                  {memberOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="dark:bg-gray-900"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <CrmUserCell name={lead.assignedToName} />
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          {profileItems.map((item) => (
            <div key={item.label}>
              <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                {item.label}
              </dt>
              <dd className="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {lead.notesText ? (
          <div>
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              {t("common.notes")}
            </p>
            <p className="mt-1 whitespace-pre-line text-theme-sm text-gray-700 dark:text-gray-300">
              {lead.notesText}
            </p>
          </div>
        ) : null}
      </ComponentCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t("detail.notes")}>
          {canManage ? (
            <div className="space-y-3">
              <TextArea
                placeholder={t("detail.notePlaceholder")}
                value={noteBody}
                onChange={setNoteBody}
                rows={3}
              />
              {noteError ? (
                <p className="text-theme-sm text-error-500">{t(noteError)}</p>
              ) : null}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={saveNote}
                  disabled={isPending || !noteBody.trim()}
                >
                  {isPending ? t("common.saving") : t("detail.saveNote")}
                </Button>
              </div>
            </div>
          ) : null}

          {lead.notes.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("detail.noNotes")}
            </p>
          ) : (
            <ul className="space-y-4">
              {lead.notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/3"
                >
                  <p className="whitespace-pre-line text-theme-sm text-gray-700 dark:text-gray-300">
                    {note.body}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                      <CrmUserCell name={note.authorName} />
                      {formatDateTime(note.createdAt)}
                    </span>
                    {canManage ? (
                      <button
                        type="button"
                        aria-label={t("common.delete")}
                        onClick={() =>
                          setDeleteTarget({ kind: "note", id: note.id })
                        }
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-500 dark:hover:bg-white/5"
                      >
                        <TrashBinIcon />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ComponentCard>

        <ComponentCard title={t("detail.followUps")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {lead.followUps.length > 0
                ? `${lead.followUps.length}`
                : t("detail.noFollowUps")}
            </p>
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => setFollowUpOpen(true)}>
                {t("detail.newFollowUp")}
              </Button>
            ) : null}
          </div>

          {lead.followUps.length > 0 ? (
            <ul className="space-y-4">
              {lead.followUps.map((followUp) => (
                <li
                  key={followUp.id}
                  className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {t(`followUpType.${followUp.type}`)} ·{" "}
                      {formatDateTime(followUp.dueAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      {canManage ? (
                        <CrmInlineSelect
                          value={followUp.status}
                          options={followUpStatusOptions}
                          onChange={(value) =>
                            runAction(() => setFollowUpStatus(followUp.id, value))
                          }
                          ariaLabel={`${t("detail.followUps")}: ${t("common.status")}`}
                        />
                      ) : (
                        <CrmStatusBadge
                          entity="followUp"
                          status={followUp.status}
                        />
                      )}
                      {canManage ? (
                        <button
                          type="button"
                          aria-label={t("common.delete")}
                          onClick={() =>
                            setDeleteTarget({ kind: "followUp", id: followUp.id })
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-500 dark:hover:bg-white/5"
                        >
                          <TrashBinIcon />
                        </button>
                      ) : null}
                    </span>
                  </div>
                  {followUp.notes ? (
                    <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
                      {followUp.notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </ComponentCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t("detail.tasks")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {lead.tasks.length > 0 ? `${lead.tasks.length}` : t("detail.noTasks")}
            </p>
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
                {t("detail.newTask")}
              </Button>
            ) : null}
          </div>

          {lead.tasks.length > 0 ? (
            <ul className="space-y-4">
              {lead.tasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {task.title}
                    </span>
                    <span className="flex items-center gap-2">
                      <CrmPriorityBadge priority={task.priority} />
                      {canManage ? (
                        <CrmInlineSelect
                          value={task.status}
                          options={taskStatusOptions}
                          onChange={(value) =>
                            runAction(() => setTaskStatus(task.id, value))
                          }
                          ariaLabel={`${task.title}: ${t("common.status")}`}
                        />
                      ) : (
                        <CrmStatusBadge entity="task" status={task.status} />
                      )}
                      {canManage ? (
                        <button
                          type="button"
                          aria-label={t("common.delete")}
                          onClick={() =>
                            setDeleteTarget({ kind: "task", id: task.id })
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-500 dark:hover:bg-white/5"
                        >
                          <TrashBinIcon />
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {task.dueAt ? formatDateTime(task.dueAt) : t("common.dueAt")}
                    </span>
                    <CrmUserCell name={task.assignedToName} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </ComponentCard>

        <ComponentCard title={t("detail.timeline")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {lead.activities.length > 0
                ? `${lead.activities.length}`
                : t("detail.noTimeline")}
            </p>
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => setActivityOpen(true)}>
                {t("detail.logActivity")}
              </Button>
            ) : null}
          </div>

          {lead.activities.length > 0 ? (
            <ol className="space-y-5 border-s border-gray-200 ps-5 dark:border-gray-800">
              {lead.activities.map((activity) => (
                <li key={activity.id} className="relative">
                  <span className="absolute -start-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-500/10" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                      {t(`activityType.${activity.type}`)}
                    </span>
                    <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {activity.subject}
                    </span>
                  </div>
                  {activity.description ? (
                    <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                      {activity.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-theme-xs text-gray-400 dark:text-gray-500">
                    <CrmUserCell name={activity.actorName} />
                    <span>{formatDateTime(activity.occurredAt)}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </ComponentCard>
      </div>

      <CrmFormModal
        key={`lead-edit-${lead.id}`}
        isOpen={editing}
        onClose={() => setEditing(false)}
        title={t("leads.editLead")}
        fields={editFields}
        submitLabel={t("common.edit")}
        onSubmit={(formData) => {
          formData.set("id", lead.id);
          return updateLead(formData);
        }}
      />

      <CrmFormModal
        key="follow-up-new"
        isOpen={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title={t("detail.newFollowUp")}
        fields={followUpFields}
        submitLabel={t("detail.newFollowUp")}
        onSubmit={(formData) =>
          addFollowUp(
            lead.id,
            fieldValue(formData, "type"),
            fieldValue(formData, "dueAt"),
            fieldValue(formData, "notes"),
          )
        }
      />

      <CrmFormModal
        key="lead-task-new"
        isOpen={taskOpen}
        onClose={() => setTaskOpen(false)}
        title={t("detail.newTask")}
        fields={taskFields}
        submitLabel={t("detail.newTask")}
        onSubmit={(formData) => {
          formData.set("leadId", lead.id);
          return createTask(formData);
        }}
      />

      <CrmFormModal
        key="log-activity-new"
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
        title={t("detail.logActivity")}
        fields={activityFields}
        submitLabel={t("detail.logActivity")}
        onSubmit={(formData) =>
          logCrmActivity(
            lead.id,
            fieldValue(formData, "type"),
            fieldValue(formData, "subject"),
            fieldValue(formData, "description"),
          )
        }
      />

      <CrmDeleteDialog
        isOpen={deleting}
        onClose={() => setDeleting(false)}
        title={t("leads.deleteTitle")}
        message={t("leads.deleteMessage")}
        onConfirm={async () => {
          const result = await deleteLead(lead.id);
          if (result.ok) {
            router.push("/crm/leads");
          }
          return result;
        }}
      />

      <CrmDeleteDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("common.delete")}
        message={t("leads.deleteMessage")}
        onConfirm={async () => {
          if (!deleteTarget) {
            return { ok: false, errorKey: "crm.errors.notFound" };
          }
          const result =
            deleteTarget.kind === "note"
              ? await deleteNote(deleteTarget.id)
              : deleteTarget.kind === "followUp"
                ? await deleteFollowUp(deleteTarget.id)
                : await deleteTask(deleteTarget.id);
          if (result.ok) {
            setDeleteTarget(null);
          }
          return result;
        }}
      />

    </div>
  );
}
