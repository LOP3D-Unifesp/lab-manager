import { useCallback, useEffect, useState } from "react";

import { getNextTaskPosition, getTaskErrorMessage, type ProjectTask, type TaskPriority, type TaskStatus } from "../../lib/projects";
import { archiveProjectTask, deleteProjectTask, updateProjectTask } from "../../lib/supabaseRepository";

// Carrega as tarefas de um quadro e cuida de mover cards entre colunas, mudar prioridade, arquivar e apagar
// (tudo otimista, com desfazer em erro). `loader` precisa ser estável (useCallback), porque dispara um novo
// carregamento quando muda.
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

  // Aplica a mudança na tela já, grava no banco e, se falhar, volta ao que estava.
  const aplicar = useCallback(
    async (mudar: (lista: ProjectTask[]) => ProjectTask[], gravar: () => Promise<void>) => {
      if (!tarefas) return;
      const anterior = tarefas;
      setTarefas(mudar(tarefas));
      try {
        setErro("");
        await gravar();
      } catch (error) {
        setTarefas(anterior);
        setErro(getTaskErrorMessage(error));
      }
    },
    [tarefas],
  );

  const mover = useCallback(
    async (task: ProjectTask, status: TaskStatus) => {
      if (!tarefas || task.status === status) return;
      const position = getNextTaskPosition(
        tarefas.filter((item) => item.project_id === task.project_id),
        status,
      );
      await aplicar(
        (lista) => lista.map((item) => (item.id === task.id ? { ...item, status, position } : item)),
        () => updateProjectTask(task.id, { status }),
      );
    },
    [tarefas, aplicar],
  );

  const mudarPrioridade = useCallback(
    async (task: ProjectTask, priority: TaskPriority) => {
      if (task.priority === priority) return;
      await aplicar(
        (lista) => lista.map((item) => (item.id === task.id ? { ...item, priority } : item)),
        () => updateProjectTask(task.id, { priority }),
      );
    },
    [aplicar],
  );

  const arquivar = useCallback(
    async (task: ProjectTask, archived: boolean) => {
      const archived_at = archived ? new Date().toISOString() : null;
      await aplicar(
        (lista) => lista.map((item) => (item.id === task.id ? { ...item, archived_at } : item)),
        () => archiveProjectTask(task.id, archived),
      );
    },
    [aplicar],
  );

  const apagar = useCallback(
    async (task: ProjectTask) => {
      await aplicar(
        (lista) => lista.filter((item) => item.id !== task.id),
        () => deleteProjectTask(task.id),
      );
    },
    [aplicar],
  );

  return { tarefas, erro, setErro, recarregar, mover, mudarPrioridade, arquivar, apagar };
}
