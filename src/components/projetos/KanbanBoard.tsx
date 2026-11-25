import { getLocale, useT } from "../../i18n";
import { useState } from "react";
import { Archive, ArchiveRestore, CalendarDays, ChevronDown, ChevronUp, ListChecks, Trash2 } from "lucide-react";

import {
  getChecklistProgress,
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
import { TaskTimer } from "./TaskTimer";

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
  /** `antesDe`: cartão à frente do qual a tarefa entra na coluna (null/ausente = no fim). */
  onMove: (task: ProjectTask, status: TaskStatus, antesDe?: string | null) => void;
  /** Avisa quando um arrasto começa/termina (o quadro ao vivo espera o arrasto acabar para recarregar). */
  onDragChange?: (arrastando: boolean) => void;
  /** Quando informado, o cartão ganha o botão de pausar/retomar o cronômetro. */
  onToggleTimer?: (task: ProjectTask, running: boolean) => void;
  /** Quando informado, os itens da checklist podem ser marcados direto no cartão. */
  onToggleChecklistItem?: (task: ProjectTask, itemId: string, done: boolean) => void;
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

export function KanbanBoard({ canDelete, onArchive, onDelete, onDragChange, onMove, onOpen, onPriorityChange, onToggleChecklistItem, onToggleTimer, showProject = false, tasks }: KanbanBoardProps) {
  const t = useT();
  const groups = groupTasksByStatus(tasks);
  const today = todayLocal();
  const [arrastando, setArrastando] = useState<string | null>(null);
  // Onde o cartão cairia: coluna e cartão à frente do qual entra (null = fim da coluna).
  const [destino, setDestino] = useState<{ status: TaskStatus; antesDe: string | null } | null>(null);
  const [checklistsAbertas, setChecklistsAbertas] = useState<Set<string>>(new Set());
  const [apagando, setApagando] = useState<ProjectTask | null>(null);

  function terminarArrasto() {
    setArrastando(null);
    setDestino(null);
    onDragChange?.(false);
  }

  function soltar() {
    const task = tasks.find((item) => item.id === arrastando);
    const alvo = destino;
    terminarArrasto();
    if (!task || !alvo || alvo.antesDe === task.id) return;
    const coluna = groups[alvo.status];
    const indice = coluna.findIndex((item) => item.id === task.id);
    // Soltar no mesmo lugar (logo antes do cartão que já vem depois) não muda nada.
    if (task.status === alvo.status && indice !== -1 && (coluna[indice + 1]?.id ?? null) === alvo.antesDe) return;
    onMove(task, alvo.status, alvo.antesDe);
  }

  function alternarChecklist(id: string) {
    setChecklistsAbertas((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {taskStatusOptions.map((column) => (
        <section
          key={column.value}
          aria-label={column.label}
          onDragOver={(event) => {
            event.preventDefault();
            if (!arrastando) return;
            // Fora dos cartões: acima do primeiro (título da coluna) = entra no topo; abaixo do último = entra no fim;
            // no espaço entre cartões mantém o destino que já estava marcado.
            const artigos = event.currentTarget.querySelectorAll("article");
            const primeiro = artigos[0];
            const ultimo = artigos[artigos.length - 1];
            const outros = groups[column.value].filter((item) => item.id !== arrastando);
            if (primeiro && event.clientY < primeiro.getBoundingClientRect().top) {
              const antesDe = outros[0]?.id ?? null;
              setDestino((atual) => (atual?.status === column.value && atual.antesDe === antesDe ? atual : { status: column.value, antesDe }));
            } else if (!ultimo || event.clientY > ultimo.getBoundingClientRect().bottom) {
              setDestino((atual) => (atual?.status === column.value && atual.antesDe === null ? atual : { status: column.value, antesDe: null }));
            } else {
              setDestino((atual) => (atual?.status === column.value ? atual : { status: column.value, antesDe: null }));
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            soltar();
          }}
          className={[
            "flex min-h-40 flex-col gap-3 rounded-lg border p-3 transition",
            destino?.status === column.value ? "border-primary bg-primary-soft" : "border-border bg-background",
          ].join(" ")}
        >
          <header className="flex items-center justify-between">
            <h4 className="text-base font-bold text-text">{column.label}</h4>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-sm font-semibold text-muted">
              {groups[column.value].length}
            </span>
          </header>

          {groups[column.value].map((task, indice) => {
            const coluna = groups[column.value];
            const marcaAntes = destino?.status === column.value && destino.antesDe === task.id;
            const marcaFim = destino?.status === column.value && destino.antesDe === null && indice === coluna.length - 1 && arrastando !== task.id;
            const progresso = getChecklistProgress(task.checklist);
            const aberta = checklistsAbertas.has(task.id);
            const arquivada = task.archived_at !== null;
            const atrasada = !arquivada && isTaskOverdue(task, today);
            const podeApagar = Boolean(onDelete && canDelete?.(task));
            return (
              <article
                key={task.id}
                draggable={!arquivada}
                onDragStart={() => {
                  setArrastando(task.id);
                  onDragChange?.(true);
                }}
                onDragEnd={terminarArrasto}
                onDragOver={(event) => {
                  if (!arrastando) return;
                  event.preventDefault();
                  event.stopPropagation();
                  // Sobre o próprio cartão arrastado: mantém o destino atual.
                  if (arrastando === task.id) return;
                  // Metade de cima: entra antes deste cartão; metade de baixo: antes do próximo.
                  const caixa = event.currentTarget.getBoundingClientRect();
                  const emBaixo = event.clientY > caixa.top + caixa.height / 2;
                  const proximo = coluna.slice(indice + 1).find((item) => item.id !== arrastando);
                  const antesDe = emBaixo ? (proximo?.id ?? null) : task.id;
                  setDestino((atual) => (atual?.status === column.value && atual.antesDe === antesDe ? atual : { status: column.value, antesDe }));
                }}
                className={[
                  "relative grid gap-2 rounded-lg border bg-surface p-3 shadow-sm",
                  arquivada ? "opacity-70" : "cursor-grab",
                  arrastando === task.id ? "opacity-50" : "",
                  atrasada ? "border-danger" : "border-border",
                ].join(" ")}
              >
                {marcaAntes ? <span aria-hidden="true" className="pointer-events-none absolute -top-2 left-0 right-0 h-1 rounded-full bg-primary" /> : null}
                {marcaFim ? <span aria-hidden="true" className="pointer-events-none absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-primary" /> : null}
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
                {progresso.total > 0 ? (
                  <div className="grid gap-1">
                    <button
                      type="button"
                      aria-expanded={aberta}
                      aria-label={t("tasks.checklistToggle", { title: task.title })}
                      className="flex items-center gap-2 text-sm text-muted hover:text-text"
                      onClick={() => alternarChecklist(task.id)}
                    >
                      <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className={progresso.done === progresso.total ? "font-semibold text-success-dark" : ""}>
                        {progresso.done}/{progresso.total}
                      </span>
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${progresso.percent}%` }} />
                      </span>
                    </button>
                    {aberta ? (
                      <ul className="grid gap-1">
                        {task.checklist.map((item) => (
                          <li key={item.id}>
                            <label className="flex items-start gap-2 text-sm text-text">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                                checked={item.done}
                                disabled={!onToggleChecklistItem}
                                onChange={(event) => onToggleChecklistItem?.(task, item.id, event.target.checked)}
                              />
                              <span className={["min-w-0 break-words", item.done ? "text-muted line-through" : ""].join(" ")}>{item.title}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <TaskTimer task={task} onToggle={onToggleTimer} />
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
                  <div className="hidden items-center gap-2 text-sm text-muted [@media(pointer:coarse)]:flex">
                    <span className="shrink-0">{t("tasks.orderLabel")}</span>
                    <button
                      type="button"
                      aria-label={t("tasks.moveUp", { title: task.title })}
                      disabled={indice === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
                      onClick={() => onMove(task, task.status, coluna[indice - 1]?.id ?? null)}
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("tasks.moveDown", { title: task.title })}
                      disabled={indice === coluna.length - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
                      onClick={() => onMove(task, task.status, coluna[indice + 2]?.id ?? null)}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
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
