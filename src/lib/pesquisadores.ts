import { useEffect, useState } from "react";
import {
  carregarLocalDatabase,
  criarLocalProfile,
  observarLocalDatabase,
  salvarLocalDatabase,
} from "./localDatabase";

export type Pesquisador = {
  id: string;
  nome: string;
  sobrenome: string;
  vinculo: string;
  status: string;
  email: string;
  telefone: string;
  habilidades: string[];
};

function formatarPresenca(status: string) {
  if (status === "Remoto") {
    return "Remoto";
  }

  return "No laboratorio";
}

async function carregarPesquisadores() {
  const database = await carregarLocalDatabase();

  return database.profiles
    .filter((profile) => profile.is_active)
    .map((profile) => ({
      id: profile.id,
      nome: profile.first_name,
      sobrenome: profile.last_name,
      vinculo: profile.academic_affiliation,
      status: formatarPresenca(profile.presence_status),
      email: profile.email ?? "",
      telefone: profile.phone ?? "",
      habilidades: profile.skills ?? [],
    }));
}

export function usePesquisadoresCadastrados() {
  const [pesquisadores, setPesquisadores] = useState<Pesquisador[]>([]);

  useEffect(() => {
    let ativo = true;

    const atualizarPesquisadores = async () => {
      const lista = await carregarPesquisadores();

      if (ativo) {
        setPesquisadores(lista);
      }
    };

    atualizarPesquisadores();
    const pararObservacao = observarLocalDatabase(atualizarPesquisadores);

    return () => {
      ativo = false;
      pararObservacao();
    };
  }, []);

  const adicionarPesquisador = async (
    pesquisador: Omit<Pesquisador, "id">,
  ) => {
    const database = await carregarLocalDatabase();
    const emailNormalizado = pesquisador.email.trim().toLowerCase();

    if (
      database.profiles.some(
        (profile) =>
          (profile.email ?? "").trim().toLowerCase() === emailNormalizado,
      )
    ) {
      return;
    }

    const profile = criarLocalProfile({
      first_name: pesquisador.nome,
      last_name: pesquisador.sobrenome,
      academic_affiliation: pesquisador.vinculo,
      presence_status: pesquisador.status,
      email: emailNormalizado,
      phone: pesquisador.telefone,
    });

    await salvarLocalDatabase({
      ...database,
      profiles: [...database.profiles, profile],
    });
    setPesquisadores(await carregarPesquisadores());
  };

  const excluirPesquisador = async (id: string) => {
    const database = await carregarLocalDatabase();

    await salvarLocalDatabase({
      ...database,
      profiles: database.profiles.map((profile) =>
        profile.id === id
          ? { ...profile, is_active: false, updated_at: new Date().toISOString() }
          : profile,
      ),
    });
    setPesquisadores(await carregarPesquisadores());
  };

  return {
    pesquisadores,
    adicionarPesquisador,
    excluirPesquisador,
  };
}
