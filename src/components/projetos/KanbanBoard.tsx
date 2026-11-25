import { getLocale, useT } from "../../i18n";
import { useState } from "react";
import { Archive, ArchiveRestore, CalendarDays, Trash2 } from "lucide-react";

import {
  getProjectColor,
  getTaskStatusLabel,
  taskPriorityOptions,
  groupTasksByStatus,
  isTaskOverdue,
  taskStatusOptions,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "../../lib/projects";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

const priorityClasses: Record<TaskPriority, string> = {
  urgent: "border-danger bg-danger-soft text-danger-dark",
  high: "border-warning bg-warning-soft text-warning-dark",
  normal: "border-border bg-background text-text",
  low: "border-border bg-background text-muted",
};

type KanbanBoardProps = {
  tasks: ProjectTask[];
  onMove: (task: ProjectTask, status: TaskStatus) => void;
  /** Quando informado, o cartão ganha um seletor de prioridade. */
  onPriorityChange?: (task: ProjectTask, priority: TaskPriority) => void;
  onOpen?: (task: ProjectTask) => void;
  /** Quando informado, o cartão ganha o botão de arquivar (e de desarquivar, nas arquivadas). */
  onArchive?: (task: ProjectTask, archived: boolean) => void;
  /** Quando informado, o cartão ganha a lixeira nas tarefas em que `canDelete` for verdadeiro (com confirmação). */
  onDelete?: (task: ProjectTask) => void;
  canDelete?: (task: ProjectTask) => boolean;
  showProject?: boolean;
};

export function KanbanBoard({ canDelete, onArchive, onDelete, onMove, onOpen, onPriorityChange, showProject = false, tasks }: KanbanBoardProps) {
  const t = useT();
  const groups = groupTasksByStatus(tasks);
  const today = todayLocal();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<TaskStatus | null>(null);
  const [apagando, setApagando] = useState<ProjectTask | null>(null);

  function soltar(status: TaskStatus) {
    const task = tasks.find((item) => item.id === arrastando);
    setArrastando(null);
    setColunaAlvo(null);
    if (task && task.status !== status) onMove(task, status);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {taskStatusOptions.map((column) => (
        <section
          key={column.value}
          aria-label={column.label}
          onDragOver={(event) => {
            event.preventDefault();
            setColunaAlvo(column.value);
          }}
          onDragLeave={() => setColunaAlvo((current) => (current === column.value ? null : current))}
          onDrop={() => soltar(column.value)}
          className={[
            "flex min-h-40 flex-col gap-3 rounded-lg border p-3 transition",
            colunaAlvo === column.value ? "border-primary bg-primary-soft" : "border-border bg-background",
          ].join(" ")}
        >
          <header className="flex items-center justify-between">
            <h4 className="text-base font-bold text-text">{column.label}</h4>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-sm font-semibold text-muted">
              {groups[column.value].length}
            </span>
          </header>

          {groups[column.value].map((task) => {
            const arquivada = task.archived_at !== null;
            const atrasada = !arquivada && isTaskOverdue(task, today);
            const podeApagar = Boolean(onDelete && canDelete?.(task));
            return (
              <article
                key={task.id}
                draggable={!arquivada}
                onDragStart={() => setArrastando(task.id)}
                onDragEnd={() => {
                  setArrastando(null);
                  setColunaAlvo(null);
                }}
                className={[
                  "grid gap-2 rounded-lg border bg-surface p-3 shadow-sm",
                  arquivada ? "opacity-70" : "cursor-grab",
                  arrastando === task.id ? "opacity-50" : "",
                  atrasada ? "border-danger" : "border-border",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 break-words text-left text-base font-semibold text-text hover:text-primary"
                    onClick={() => onOpen?.(task)}
                  >
                    {task.title}
                  </button>
                  {onArchive || podeApagar ? (
                    <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                      {onArchive ? (
                        <button
                          type="button"
                          aria-label={arquivada ? t("tasks.unarchiveTask", { title: task.title }) : t("tasks.archiveTask", { title: task.title })}
                          title={arquivada ? t("tasks.unarchive") : t("tasks.archive")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
                          onClick={() => onArchive(task, !arquivada)}
                        >
                          {arquivada ? <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      ) : null}
                      {podeApagar ? (
                        <button
                          type="button"
                          aria-label={t("tasks.deleteTask", { title: task.title })}
                          title={t("tasks.delete")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-danger-dark transition hover:bg-danger-soft"
                          onClick={() => setApagando(task)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {arquivada ? (
                  <span className="w-fit rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-muted">
                    {t("tasks.archivedBadge")}
                  </span>
                ) : null}
                {showProject && task.project_name ? (
                  <span
                    className="w-fit max-w-full truncate rounded-full border px-2 py-0.5 text-xs font-semibold"
                    style={getProjectColor(task.project_id)}
                  >
                    {task.project_name}
                  </span>
                ) : null}
                {task.due_on ? (
                  <p className={["flex items-center gap-1 text-sm", atrasada ? "font-semibold text-danger" : "text-muted"].join(" ")}>
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {atrasada ? t("tasks.late") : ""}
                    {formatDueDate(task.due_on)}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex -space-x-2">
                    {task.assignees.map((assignee) => (
                      <Avatar
                        key={assignee.profile_id}
                        avatarUrl={assignee.avatar_url}
                        name={assignee.full_name}
                        className="h-7 w-7 ring-2 ring-surface"
                      />
                    ))}
                  </div>
                  {onPriorityChange ? (
                    <select
                      aria-label={t("tasks.setPriority", { title: task.title })}
                      className={["min-h-9 min-w-0 max-w-full rounded-md border px-2 text-sm font-semibold", priorityClasses[task.priority]].join(" ")}
                      value={task.priority}
                      onChange={(event) => onPriorityChange(task, event.target.value as TaskPriority)}
                    >
                      {taskPriorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                {/* No toque não existe arrastar de verdade: celular e tablet trocam a coluna por este seletor
                    (no computador, a coluna muda arrastando o cartão ou em Editar). */}
                {arquivada ? null : (
                  <label className={onPriorityChange ? "hidden items-center gap-2 text-sm text-muted [@media(pointer:coarse)]:flex" : "flex items-center gap-2 text-sm text-muted"}>
                    <span className="shrink-0">{t("tasks.moveLabel")}</span>
                    <select
                      aria-label={t("tasks.moveTo", { title: task.title })}
                      className="min-h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                      value={task.status}
                      onChange={(event) => onMove(task, event.target.value as TaskStatus)}
                    >
                      {taskStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {getTaskStatusLabel(option.value)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </article>
            );
          })}

          {groups[column.value].length === 0 ? <p className="text-sm text-muted">{t("tasks.noTasks")}</p> : null}
        </section>
      ))}

      {apagando ? (
        <ConfirmDialog
          confirmLabel={t("tasks.deleteConfirmButton")}
          onCancel={() => setApagando(null)}
          onConfirm={() => {
            const task = apagando;
            setApagando(null);
            onDelete?.(task);
          }}
          title={t("tasks.deleteTitle")}
        >
          <p className="font-semibold">{apagando.title}</p>
          <p className="mt-2 text-muted">{t("tasks.deleteWarning")}</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
