import { useState } from "react";

import { isTaskSort, type TaskSort } from "../../lib/projects";

const STORAGE_KEY = "tarefas:ordem";

function readSaved(): TaskSort {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isTaskSort(saved) ? saved : "manual";
  } catch {
    return "manual";
  }
}

// Ordem escolhida para os quadros de tarefas. É uma só para todos os quadros e fica salva neste navegador.
export function useTaskSort() {
  const [sort, setSort] = useState<TaskSort>(readSaved);

  function changeSort(value: TaskSort) {
    setSort(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // sem armazenamento local: a ordem só vale nesta visita
    }
  }

  return [sort, changeSort] as const;
}
