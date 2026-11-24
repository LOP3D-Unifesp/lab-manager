import { useT } from "../../i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { isProjectOpen, type Project, type ProjectTask } from "../../lib/projects";
import { listMyTasks, listProjects } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { KanbanBoard } from "./KanbanBoard";
import { TaskModal } from "./TaskModal";
import { useTaskBoard } from "./useTaskBoard";

// Kanban pessoal: só as tarefas atribuídas à pessoa, de todos os projetos. Fica visível enquanto ela
// participar de algum projeto, para poder criar a primeira tarefa sem sair do Dashboard.
export function MyTasksBoard({ isCoordinator, profileId }: { isCoordinator: boolean; profileId: string }) {
  const t = useT();
  const loader = useCallback(() => listMyTasks(profileId), [profileId]);
  const { erro, mover, mudarPrioridade, recarregar, tarefas } = useTaskBoard(loader);
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

  const projetosAbertos = useMemo(() => projetos.filter((projeto) => isProjectOpen(projeto.status)), [projetos]);

  if (!tarefas || (tarefas.length === 0 && projetosAbertos.length === 0 && !erro)) return null;

  return (
    <section className="mt-6">
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
            {t("tasks.mineEmpty")}
          </p>
        ) : (
          <div className="mt-4">
            <KanbanBoard tasks={tarefas} showProject onMove={mover} onPriorityChange={mudarPrioridade} onOpen={(task) => setModal({ task })} />
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
