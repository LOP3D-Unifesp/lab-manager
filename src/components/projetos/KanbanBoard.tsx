import { getLocale, useT } from "../../i18n";
import { useState } from "react";
import { CalendarDays } from "lucide-react";

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

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDueDate(value: string) {
  const [, month, day] = value.split("-");
  return new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

type KanbanBoardProps = {
  tasks: ProjectTask[];
  onMove: (task: ProjectTask, status: TaskStatus) => void;
  /** Quando informado, o cartão ganha um seletor de prioridade. */
  onPriorityChange?: (task: ProjectTask, priority: TaskPriority) => void;
  onOpen?: (task: ProjectTask) => void;
  showProject?: boolean;
};

export function KanbanBoard({ onMove, onOpen, onPriorityChange, showProject = false, tasks }: KanbanBoardProps) {
  const t = useT();
  const groups = groupTasksByStatus(tasks);
  const today = todayLocal();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<TaskStatus | null>(null);

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
            const atrasada = isTaskOverdue(task, today);
            return (
              <article
                key={task.id}
                draggable
                onDragStart={() => setArrastando(task.id)}
                onDragEnd={() => {
                  setArrastando(null);
                  setColunaAlvo(null);
                }}
                className={[
                  "grid cursor-grab gap-2 rounded-lg border bg-surface p-3 shadow-sm",
                  arrastando === task.id ? "opacity-50" : "",
                  atrasada ? "border-danger" : "border-border",
                ].join(" ")}
              >
                <button
                  type="button"
                  className="text-left text-base font-semibold text-text hover:text-primary"
                  onClick={() => onOpen?.(task)}
                >
                  {task.title}
                </button>
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
                      className={[
                        "min-h-9 min-w-0 max-w-full rounded-md border px-2 text-sm font-semibold",
                        task.priority === "urgent"
                          ? "border-danger bg-danger-soft text-danger-dark"
                          : task.priority === "low"
                            ? "border-border bg-background text-muted"
                            : "border-border bg-background text-text",
                      ].join(" ")}
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
              </article>
            );
          })}

          {groups[column.value].length === 0 ? <p className="text-sm text-muted">{t("tasks.noTasks")}</p> : null}
        </section>
      ))}
    </div>
  );
}
