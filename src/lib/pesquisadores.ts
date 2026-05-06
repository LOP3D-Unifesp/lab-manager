export type Pesquisador = {
  nome: string;
  vinculo: string;
  status: "No laboratorio" | "Remoto";
};

export const pesquisadores: Pesquisador[] = [
  { nome: "Ana Lima", vinculo: "Mestrado", status: "No laboratorio" },
  { nome: "Bruno Costa", vinculo: "IC", status: "Remoto" },
  { nome: "Carla Mendes", vinculo: "Doutorado", status: "No laboratorio" },
  { nome: "Diego Rocha", vinculo: "Mestrado", status: "No laboratorio" },
  { nome: "Fernanda Alves", vinculo: "Doutorado", status: "Remoto" },
  { nome: "Gabriel Nunes", vinculo: "IC", status: "No laboratorio" },
  { nome: "Helena Martins", vinculo: "Mestrado", status: "No laboratorio" },
  { nome: "Igor Santos", vinculo: "Doutorado", status: "Remoto" },
  { nome: "Julia Torres", vinculo: "IC", status: "No laboratorio" },
  { nome: "Lucas Pereira", vinculo: "Mestrado", status: "No laboratorio" },
  { nome: "Marina Souza", vinculo: "Doutorado", status: "No laboratorio" },
  { nome: "Nicolas Ferreira", vinculo: "IC", status: "Remoto" },
];

export const nomesPesquisadores = pesquisadores.map(
  (pesquisador) => pesquisador.nome,
);
