import { useEffect, useState } from "react";

import { getFundingAgencyLabel } from "./domain";
import { listProfiles } from "./supabaseRepository";

export type Pesquisador = {
  id: string;
  nome: string;
  sobrenome: string;
  vinculo: string;
  status: string;
  email: string;
  telefone: string;
  temBolsaFomento: boolean;
  agenciaFomento: string | null;
  cargaHorariaSemanal: number | null;
  lattesUrl: string;
  habilidades: string[];
};

function getVinculoLabel(value: string | null) {
  const labels: Record<string, string> = {
    ic: "IC",
    extension: "Extensao",
    intern: "Estagiario",
    tcc: "TCC",
    masters: "Mestrado",
    phd: "Doutorado",
    postdoc: "Pos-doutorado",
    visitor: "Visitante",
    technician: "Tecnico",
    faculty: "Docente",
    other: "Outro",
  };

  return value ? labels[value] ?? value : "Nao informado";
}

async function carregarPesquisadores() {
  const profiles = await listProfiles();

  return profiles.map((profile) => ({
    id: profile.id,
    nome: profile.first_name,
    sobrenome: profile.last_name,
    vinculo: getVinculoLabel(profile.academic_affiliation),
    status: "No laboratorio",
    email: profile.email,
    telefone: profile.phone ?? "",
    temBolsaFomento: profile.has_funding_grant,
    agenciaFomento: getFundingAgencyLabel(
      profile.funding_agency,
      profile.funding_agency_other,
    ),
    cargaHorariaSemanal: profile.weekly_workload_hours,
    lattesUrl: profile.lattes_url ?? "",
    habilidades: [],
  }));
}

export function usePesquisadoresCadastrados() {
  const [pesquisadores, setPesquisadores] = useState<Pesquisador[]>([]);

  const atualizarPesquisadores = async () => {
    setPesquisadores(await carregarPesquisadores());
  };

  useEffect(() => {
    let ativo = true;

    carregarPesquisadores().then((lista) => {
      if (ativo) {
        setPesquisadores(lista);
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  const adicionarPesquisador = async () => {
    throw new Error("Cadastro direto desativado. Use o fluxo de convites.");
  };

  const excluirPesquisador = async () => {
    throw new Error("Inativacao direta desativada. Use administracao de usuarios.");
  };

  return {
    pesquisadores,
    atualizarPesquisadores,
    adicionarPesquisador,
    excluirPesquisador,
  };
}
