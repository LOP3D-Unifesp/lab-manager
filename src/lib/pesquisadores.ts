import { useEffect, useState } from "react";

import { getFundingGrantLabels, type AvailabilitySlot } from "./domain";
import { listAvailability, listProfiles } from "./supabaseRepository";

export type StatusPresenca = "Presente" | "Remoto" | "Em aula" | "Ausente";

export type Pesquisador = {
  id: string;
  nome: string;
  sobrenome: string;
  vinculo: string;
  status: StatusPresenca;
  email: string;
  telefone: string;
  avatarUrl: string | null;
  bolsasFomento: string[];
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

function getStatusPresenca(
  profileId: string,
  availability: AvailabilitySlot[],
  weekdayHoje: number,
): StatusPresenca {
  const slotsDeHoje = availability.filter(
    (slot) => slot.profile_id === profileId && slot.weekday === weekdayHoje,
  );

  if (slotsDeHoje.some((slot) => slot.work_mode === "onsite")) return "Presente";
  if (slotsDeHoje.some((slot) => slot.work_mode === "remote")) return "Remoto";
  if (slotsDeHoje.some((slot) => slot.work_mode === "aula")) return "Em aula";
  return "Ausente";
}

async function carregarPesquisadores() {
  const [profiles, availability] = await Promise.all([listProfiles(), listAvailability()]);
  const weekdayHoje = new Date().getDay();

  return profiles.map((profile) => ({
    id: profile.id,
    nome: profile.first_name,
    sobrenome: profile.last_name,
    vinculo: getVinculoLabel(profile.academic_affiliation),
    status: getStatusPresenca(profile.id, availability, weekdayHoje),
    email: profile.email,
    telefone: profile.phone ?? "",
    avatarUrl: profile.avatar_url,
    bolsasFomento: getFundingGrantLabels(profile),
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
