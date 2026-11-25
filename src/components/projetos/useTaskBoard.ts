import { useCallback, useEffect, useRef, useState } from "react";

import { getTaskErrorMessage, reorderTasks, type ProjectTask, type TaskPriority, type TaskStatus } from "../../lib/projects";
import { supabase } from "../../lib/supabaseClient";
import { getTimerAfterStatusChange, toggleTaskTimer } from "../../lib/taskTimer";
import { archiveProjectTask, deleteProjectTask, moveProjectTask, setChecklistItemDone, setTaskTimer, updateProjectTask } from "../../lib/supabaseRepository";

// Mudanças em rajada (mover vários cartões, salvar checklist) viram um só recarregamento.
const REFRESH_DEBOUNCE_MS = 500;

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

  // Quadro ao vivo: quando outra pessoa mexe nas tarefas, recarrega a lista. Durante um arrasto o recarregamento
  // espera o cartão ser solto, para ele não pular debaixo do mouse.
  const arrastandoRef = useRef(false);
  const pendenteRef = useRef(false);
  const atualizarAoVivoRef = useRef<() => void>(() => undefined);
  atualizarAoVivoRef.current = () => {
    loader()
      .then((data) => setTarefas(data))
      .catch(() => undefined);
  };

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let debounce = 0;
    const agendar = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (arrastandoRef.current) {
          pendenteRef.current = true;
          return;
        }
        atualizarAoVivoRef.current();
      }, REFRESH_DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") agendar();
    };
    document.addEventListener("visibilitychange", onVisible);
    const channel = client
      .channel(`task_board_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" }, agendar)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_task_assignees" }, agendar)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_task_checklist_items" }, agendar)
      .subscribe();
    return () => {
      window.clearTimeout(debounce);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, []);

  const arrastar = useCallback((arrastando: boolean) => {
    arrastandoRef.current = arrastando;
    if (!arrastando && pendenteRef.current) {
      pendenteRef.current = false;
      atualizarAoVivoRef.current();
    }
  }, []);

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

  // `antesDe`: id do cartão à frente do qual a tarefa entra (null = fim da coluna).
  const mover = useCallback(
    async (task: ProjectTask, status: TaskStatus, antesDe: string | null = null) => {
      if (!tarefas) return;
      await aplicar(
        (lista) => {
          const agora = new Date();
          // Mudar de coluna também liga/desliga o cronômetro (o banco faz o mesmo).
          return reorderTasks(lista, task.id, status, antesDe).map((item) =>
            item.id === task.id && item.status !== task.status ? { ...item, ...getTimerAfterStatusChange(task, status, agora) } : item,
          );
        },
        () => moveProjectTask(task.id, status, antesDe),
      );
    },
    [tarefas, aplicar],
  );

  const alternarCronometro = useCallback(
    async (task: ProjectTask, correndo: boolean) => {
      await aplicar(
        (lista) => lista.map((item) => (item.id === task.id ? { ...item, ...toggleTaskTimer(item, correndo, new Date()) } : item)),
        () => setTaskTimer(task.id, correndo),
      );
    },
    [aplicar],
  );

  const marcarItem = useCallback(
    async (task: ProjectTask, itemId: string, done: boolean) => {
      await aplicar(
        (lista) =>
          lista.map((item) =>
            item.id === task.id ? { ...item, checklist: item.checklist.map((entry) => (entry.id === itemId ? { ...entry, done } : entry)) } : item,
          ),
        () => setChecklistItemDone(itemId, done),
      );
    },
    [aplicar],
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

  return { tarefas, erro, setErro, recarregar, alternarCronometro, arrastar, marcarItem, mover, mudarPrioridade, arquivar, apagar };
}
