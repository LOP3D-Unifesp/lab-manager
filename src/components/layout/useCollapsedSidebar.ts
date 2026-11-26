import { useState } from "react";

const STORAGE_KEY = "menu-recolhido";

function readSaved() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "sim";
  } catch {
    return false;
  }
}

// Menu lateral encolhido (só ícones) nas telas grandes; a escolha fica salva neste navegador.
export function useCollapsedSidebar() {
  const [collapsed, setCollapsed] = useState(readSaved);

  function toggle() {
    setCollapsed((current) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, current ? "nao" : "sim");
      } catch {
        // sem armazenamento local: a escolha só vale nesta visita
      }
      return !current;
    });
  }

  return [collapsed, toggle] as const;
}
