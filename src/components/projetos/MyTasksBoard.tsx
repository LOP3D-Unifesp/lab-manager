import { useT } from "../../i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { emptyTaskFilters, filterTasks, hasActiveTaskFilters, isProjectOpen, type Project, type ProjectTask, type TaskFilters } from "../../lib/projects";
import { listMyTasks, listProjects } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { KanbanBoard } from "./KanbanBoard";
import { TaskFilterBar } from "./TaskFilterBar";
import { TaskModal } from "./TaskModal";
import { useTaskBoard } from "./useTaskBoard";
import { useTaskSort } from "./useTaskSort";

// Kanban pessoal: só as tarefas atribuídas à pessoa, de todos os projetos. Fica sempre visível (depois de carregar):
// quem participa de algum projeto aberto pode criar a primeira tarefa sem sair do Dashboard, e quem ainda não
// participa de nenhum vê o aviso de que precisa ser adicionada a um projeto.
export function MyTasksBoard({ isCoordinator, profileId }: { isCoordinator: boolean; profileId: string }) {
  const t = useT();
  const loader = useCallback(() => listMyTasks(profileId), [profileId]);
  const { alternarCronometro, apagar, arquivar, arrastar, erro, marcarItem, mover, mudarPrioridade, recarregar, tarefas } = useTaskBoard(loader);
  const [filtros, setFiltros] = useState<TaskFilters>(emptyTaskFilters);
  const [ordem, setOrdem] = useTaskSort();
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [modal, setModal] = useState<{ task: ProjectTask | null } | null>(null);

  useEffect(() => {
    let ativo = true;
    listProjects()
      .then((data) => ativo && setProjetos(data))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  // Só dá para criar aqui uma tarefa em projeto de que a pessoa participa: a tarefa nova vem atribuída a ela, e uma
  // tarefa sem responsável (coordenador criando em projeto alheio) não apareceria em "Minhas tarefas".
  const projetosAbertos = useMemo(
    () => projetos.filter((projeto) => isProjectOpen(projeto.status) && projeto.members.some((member) => member.profile_id === profileId)),
    [projetos, profileId],
  );

  const hoje = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);
  const visiveis = useMemo(() => filterTasks(tarefas ?? [], filtros, profileId, hoje), [tarefas, filtros, profileId, hoje]);
  // Projetos com tarefa sua, para o seletor de projeto do filtro.
  const projetosDasTarefas = useMemo(() => {
    const ids = new Set((tarefas ?? []).map((task) => task.project_id));
    return projetos.filter((projeto) => ids.has(projeto.id));
  }, [tarefas, projetos]);

  if (!tarefas) return null;

  const ativas = tarefas.filter((task) => !task.archived_at);

  return (
    <section>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-text">{t("tasks.mineTitle")}</h3>
            <p className="mt-1 text-base text-muted">{t("tasks.mineHint")}</p>
          </div>
          {projetosAbertos.length > 0 ? (
            <Button variant="secondary" onClick={() => setModal({ task: null })}>
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              {t("projects.newTask")}
            </Button>
          ) : null}
        </div>
        {erro ? (
          <p className="mt-3 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        {tarefas.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">
            {projetosAbertos.length === 0 ? t("tasks.mineNoProject") : t("tasks.mineEmpty")}
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            <TaskFilterBar sort={ordem} onSortChange={setOrdem} filters={filtros} onChange={setFiltros} profileId={profileId} projects={projetosDasTarefas} />
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
              sort={ordem}
              canDelete={(task) => isCoordinator || task.created_by === profileId}
              onArchive={arquivar}
              onDelete={apagar}
              onDragChange={arrastar}
            onMove={mover}
            onToggleChecklistItem={marcarItem}
            onToggleTimer={alternarCronometro}
              onPriorityChange={mudarPrioridade}
              onOpen={(task) => setModal({ task })}
            />
          </div>
        )}
      </Card>

      {modal ? (
        <TaskModal
          task={modal.task}
          projects={modal.task ? projetos : projetosAbertos}
          defaultAssigneeIds={[profileId]}
          canDelete={isCoordinator || modal.task?.created_by === profileId}
          showProjectLink
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await recarregar();
          }}
        />
      ) : null}
    </section>
  );
}
