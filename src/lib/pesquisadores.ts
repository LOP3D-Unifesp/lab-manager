import { useEffect, useState } from "react";

export type Pesquisador = {
  id: number;
  nome: string;
  sobrenome: string;
  vinculo: string;
  status: string;
};

const STORAGE_KEY = "lab-manager:pesquisadores";
const STORAGE_EVENT = "lab-manager:pesquisadores-atualizados";

export const pesquisadoresIniciais: Pesquisador[] = [
  {
    id: 1,
    nome: "Ana",
    sobrenome: "Lima",
    vinculo: "Mestrado",
    status: "No laboratório",
  },
  {
    id: 2,
    nome: "Bruno",
    sobrenome: "Costa",
    vinculo: "IC",
    status: "Remoto",
  },
  {
    id: 3,
    nome: "Carla",
    sobrenome: "Mendes",
    vinculo: "Doutorado",
    status: "No laboratório",
  },
];

function carregarPesquisadores() {
  if (typeof window === "undefined") {
    return pesquisadoresIniciais;
  }

  const pesquisadoresSalvos = window.localStorage.getItem(STORAGE_KEY);

  if (!pesquisadoresSalvos) {
    return pesquisadoresIniciais;
  }

  try {
    return JSON.parse(pesquisadoresSalvos) as Pesquisador[];
  } catch {
    return pesquisadoresIniciais;
  }
}

function salvarPesquisadores(pesquisadores: Pesquisador[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pesquisadores));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function usePesquisadoresCadastrados() {
  const [pesquisadores, setPesquisadores] = useState(carregarPesquisadores);

  useEffect(() => {
    const atualizarPesquisadores = () => {
      setPesquisadores(carregarPesquisadores());
    };

    window.addEventListener(STORAGE_EVENT, atualizarPesquisadores);
    window.addEventListener("storage", atualizarPesquisadores);

    return () => {
      window.removeEventListener(STORAGE_EVENT, atualizarPesquisadores);
      window.removeEventListener("storage", atualizarPesquisadores);
    };
  }, []);

  const adicionarPesquisador = (pesquisador: Omit<Pesquisador, "id">) => {
    const listaAtualizada = [
      ...carregarPesquisadores(),
      {
        id: Date.now(),
        ...pesquisador,
      },
    ];

    salvarPesquisadores(listaAtualizada);
    setPesquisadores(listaAtualizada);
  };

  const excluirPesquisador = (id: number) => {
    const listaAtualizada = carregarPesquisadores().filter(
      (pesquisador) => pesquisador.id !== id,
    );

    salvarPesquisadores(listaAtualizada);
    setPesquisadores(listaAtualizada);
  };

  return {
    pesquisadores,
    adicionarPesquisador,
    excluirPesquisador,
  };
}
