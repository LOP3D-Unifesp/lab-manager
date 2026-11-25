import { t } from "../../i18n";
import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  emptyTaskFilters,
  filterTasks,
  getTaskAssigneeOptions,
  hasActiveTaskFilters,
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
import { TaskFilterBar } from "./TaskFilterBar";
import { TaskModal } from "./TaskModal";
import { useTaskBoard } from "./useTaskBoard";

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
  const { apagar, arquivar, erro, mover, mudarPrioridade, recarregar, tarefas } = useTaskBoard(loader);
  const [filtros, setFiltros] = useState<TaskFilters>(emptyTaskFilters);
  const [modal, setModal] = useState<{ task: ProjectTask | null } | null>(null);

  const projetosOrdenados = useMemo(() => sortProjects(projects), [projects]);
  const projetosAbertos = useMemo(() => projetosOrdenados.filter((projeto) => isProjectOpen(projeto.status)), [projetosOrdenados]);
  const responsaveis = useMemo(() => getTaskAssigneeOptions(tarefas ?? []), [tarefas]);
  const visiveis = useMemo(() => filterTasks(tarefas ?? [], filtros, profileId, todayLocal()), [tarefas, filtros, profileId]);
  const ativas = useMemo(() => (tarefas ?? []).filter((task) => !task.archived_at), [tarefas]);
  const canDelete = (task: ProjectTask) => isCoordinator || task.created_by === profileId;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="lg:flex-1">
          <TaskFilterBar assignees={responsaveis} filters={filtros} onChange={setFiltros} profileId={profileId} projects={projetosOrdenados} />
        </div>
        {projetosAbertos.length > 0 ? (
          <Button onClick={() => setModal({ task: null })}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("projects.newTask")}
          </Button>
        ) : null}
      </div>

      {erro ? (
        <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {tarefas === null && !erro ? <p className="text-lg text-muted">{t("tasks.loading")}</p> : null}

      {tarefas !== null && tarefas.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold">{t("tasks.none")}</p>
          <p className="mt-1 text-muted">
            {projetosAbertos.length > 0
              ? t("tasks.noneCoordinator")
              : t("tasks.noneResearcher")}
          </p>
        </Card>
      ) : null}

      {tarefas !== null && tarefas.length > 0 ? (
        <>
          {hasActiveTaskFilters(filtros) ? (
            <div className="flex items-center justify-between gap-3 text-base text-muted">
              <span>{t("tasks.countOf", { shown: visiveis.length, total: filtros.showArchived ? tarefas.length : ativas.length })}</span>
              <button type="button" className="font-semibold text-primary underline" onClick={() => setFiltros(emptyTaskFilters)}>
                {t("tasks.clearFilters")}
              </button>
            </div>
          ) : null}
          <KanbanBoard
            tasks={visiveis}
            showProject
            canDelete={canDelete}
            onArchive={arquivar}
            onDelete={apagar}
            onMove={mover}
            onPriorityChange={mudarPrioridade}
            onOpen={(task) => setModal({ task })}
          />
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
