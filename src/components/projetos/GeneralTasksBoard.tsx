import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  filterTasks,
  getTaskAssigneeOptions,
  isProjectOpen,
  sortProjects,
  type Project,
  type ProjectTask,
  type TaskFilters,
} from "../../lib/projects";
import { listVisibleTasks } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { KanbanBoard } from "./KanbanBoard";
import { TaskModal } from "./TaskModal";
import { useTaskBoard } from "./useTaskBoard";

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

type GeneralTasksBoardProps = {
  projects: Project[];
  profileId: string;
  isCoordinator: boolean;
};

// Quadro com as tarefas de todos os projetos que a pessoa vê (coordenador: todos), com filtros.
export function GeneralTasksBoard({ isCoordinator, profileId, projects }: GeneralTasksBoardProps) {
  const loader = useCallback(() => listVisibleTasks(), []);
  const { erro, mover, recarregar, tarefas } = useTaskBoard(loader);
  const [filtros, setFiltros] = useState<TaskFilters>({ projectId: "all", assignee: "all", overdueOnly: false });
  const [modal, setModal] = useState<{ task: ProjectTask | null } | null>(null);

  const projetosOrdenados = useMemo(() => sortProjects(projects), [projects]);
  const projetosAbertos = useMemo(() => projetosOrdenados.filter((projeto) => isProjectOpen(projeto.status)), [projetosOrdenados]);
  const responsaveis = useMemo(() => getTaskAssigneeOptions(tarefas ?? []), [tarefas]);
  const visiveis = useMemo(
    () => filterTasks(tarefas ?? [], filtros, profileId, todayLocal()),
    [tarefas, filtros, profileId],
  );
  const filtrando = filtros.projectId !== "all" || filtros.assignee !== "all" || filtros.overdueOnly;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:flex-1">
          <select
            aria-label="Projeto"
            className={selectClassName}
            value={filtros.projectId}
            onChange={(event) => setFiltros((current) => ({ ...current, projectId: event.target.value }))}
          >
            <option value="all">Todos os projetos</option>
            {projetosOrdenados.map((projeto) => (
              <option key={projeto.id} value={projeto.id}>
                {projeto.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Responsável"
            className={selectClassName}
            value={filtros.assignee}
            onChange={(event) => setFiltros((current) => ({ ...current, assignee: event.target.value }))}
          >
            <option value="all">Todos os responsáveis</option>
            <option value="me">Só minhas</option>
            {responsaveis
              .filter((pessoa) => pessoa.profile_id !== profileId)
              .map((pessoa) => (
                <option key={pessoa.profile_id} value={pessoa.profile_id}>
                  {pessoa.full_name}
                </option>
              ))}
          </select>
          <label
            className={[
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-base font-semibold transition",
              filtros.overdueOnly ? "border-danger bg-danger-soft text-danger-dark" : "border-border bg-surface text-text",
            ].join(" ")}
          >
            <input
              checked={filtros.overdueOnly}
              className="h-4 w-4 accent-primary"
              type="checkbox"
              onChange={(event) => setFiltros((current) => ({ ...current, overdueOnly: event.target.checked }))}
            />
            Só atrasadas
          </label>
        </div>
        {projetosAbertos.length > 0 ? (
          <Button onClick={() => setModal({ task: null })}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            Nova tarefa
          </Button>
        ) : null}
      </div>

      {erro ? (
        <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {tarefas === null && !erro ? <p className="text-lg text-muted">Carregando tarefas...</p> : null}

      {tarefas !== null && tarefas.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold">Nenhuma tarefa ainda.</p>
          <p className="mt-1 text-muted">
            {projetosAbertos.length > 0
              ? "Crie a primeira com “Nova tarefa”."
              : "As tarefas dos seus projetos aparecem aqui."}
          </p>
        </Card>
      ) : null}

      {tarefas !== null && tarefas.length > 0 ? (
        <>
          {filtrando ? (
            <div className="flex items-center justify-between gap-3 text-base text-muted">
              <span>
                {visiveis.length} de {tarefas.length} tarefa(s)
              </span>
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => setFiltros({ projectId: "all", assignee: "all", overdueOnly: false })}
              >
                Limpar filtros
              </button>
            </div>
          ) : null}
          <KanbanBoard tasks={visiveis} showProject onMove={mover} onOpen={(task) => setModal({ task })} />
        </>
      ) : null}

      {modal ? (
        <TaskModal
          task={modal.task}
          projects={modal.task ? projects : projetosAbertos}
          defaultAssigneeIds={modal.task ? [] : [profileId]}
          canDelete={isCoordinator || modal.task?.created_by === profileId}
          showProjectLink
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
