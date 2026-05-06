export type Pesquisador = {
  id: number;
  nome: string;
  sobrenome: string;
  vinculo: string;
  status: string;
};

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

export const nomesPesquisadores = pesquisadoresIniciais.map(
  (pesquisador) => `${pesquisador.nome} ${pesquisador.sobrenome}`,
);
