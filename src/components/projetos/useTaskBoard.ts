import { useCallback, useEffect, useState } from "react";

import { getNextTaskPosition, getTaskErrorMessage, type ProjectTask, type TaskPriority, type TaskStatus } from "../../lib/projects";
import { updateProjectTask } from "../../lib/supabaseRepository";

// Carrega as tarefas de um quadro e cuida de mover cards entre colunas (otimista, com desfazer em erro).
// `loader` precisa ser estável (useCallback), porque dispara um novo carregamento quando muda.
export function useTaskBoard(loader: () => Promise<ProjectTask[]>) {
  const [tarefas, setTarefas] = useState<ProjectTask[] | null>(null);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    try {
      setTarefas(await loader());
    } catch (error) {
      setErro(getTaskErrorMessage(error));
    }
  }, [loader]);

  useEffect(() => {
    let ativo = true;
    loader()
      .then((data) => ativo && setTarefas(data))
      .catch((error) => {
        if (ativo) {
          setTarefas((current) => current ?? []);
          setErro(getTaskErrorMessage(error));
        }
      });
    return () => {
      ativo = false;
    };
  }, [loader]);

  const mover = useCallback(
    async (task: ProjectTask, status: TaskStatus) => {
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
    },
    [tarefas],
  );

  const mudarPrioridade = useCallback(
    async (task: ProjectTask, priority: TaskPriority) => {
      if (!tarefas || task.priority === priority) return;
      const anterior = tarefas;
      setTarefas(tarefas.map((item) => (item.id === task.id ? { ...item, priority } : item)));
      try {
        setErro("");
        await updateProjectTask(task.id, { priority });
      } catch (error) {
        setTarefas(anterior);
        setErro(getTaskErrorMessage(error));
      }
    },
    [tarefas],
  );

  return { tarefas, erro, setErro, recarregar, mover, mudarPrioridade };
}
