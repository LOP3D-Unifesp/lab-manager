import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getNextTaskPosition,
  getTaskErrorMessage,
  type ProjectTask,
  type TaskStatus,
} from "../../lib/projects";
import { listMyTasks, updateProjectTask } from "../../lib/supabaseRepository";
import { Card } from "../ui/Card";
import { KanbanBoard } from "./KanbanBoard";

// Kanban pessoal: só as tarefas atribuídas à pessoa, de todos os projetos. Some se não houver nenhuma.
export function MyTasksBoard({ profileId }: { profileId: string }) {
  const navigate = useNavigate();
  const [tarefas, setTarefas] = useState<ProjectTask[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    listMyTasks(profileId)
      .then((data) => ativo && setTarefas(data))
      .catch((error) => {
        if (ativo) {
          setTarefas([]);
          setErro(getTaskErrorMessage(error));
        }
      });
    return () => {
      ativo = false;
    };
  }, [profileId]);

  async function mover(task: ProjectTask, status: TaskStatus) {
    if (!tarefas || task.status === status) return;
    const position = getNextTaskPosition(
      tarefas.filter((item) => item.project_id === task.project_id),
      status,
    );
    const anterior = tarefas;
    setTarefas(tarefas.map((item) => (item.id === task.id ? { ...item, status, position } : item)));
    try {
      setErro("");
      await updateProjectTask(task.id, { status });
    } catch (error) {
      setTarefas(anterior);
      setErro(getTaskErrorMessage(error));
    }
  }

  if (!tarefas || (tarefas.length === 0 && !erro)) return null;

  return (
    <section className="mt-6">
      <Card>
        <h3 className="text-2xl font-bold text-text">Minhas tarefas</h3>
        <p className="mt-1 text-base text-muted">Tarefas atribuídas a você nos projetos do laboratório.</p>
        {erro ? (
          <p className="mt-3 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="mt-4">
          <KanbanBoard
            tasks={tarefas}
            showProject
            onMove={mover}
            onOpen={(task) => navigate(`/projetos/${task.project_id}`)}
          />
        </div>
      </Card>
    </section>
  );
}
