import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, UserCheck, Users, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import {
  carregarLocalDatabase,
  observarLocalDatabase,
  salvarLocalDatabase,
  type LocalProfile,
} from "../lib/localDatabase";

const habilidadesDefinidas = [
  "Modelagem 3D",
  "Fatiamento",
  "Materiais flexiveis",
  "Pos-processamento",
  "Manutencao basica",
  "Digitalizacao 3D",
];

function profileTemHabilidade(profile: LocalProfile | null, habilidade: string) {
  return Boolean(profile?.skills?.includes(habilidade));
}

export function Habilidades() {
  const { currentProfile } = useCurrentProfile();
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [habilidadeSelecionada, setHabilidadeSelecionada] = useState(
    habilidadesDefinidas[0],
  );
  const [detalheAberto, setDetalheAberto] = useState(false);

  useEffect(() => {
    let ativo = true;

    const atualizarHabilidades = async () => {
      const database = await carregarLocalDatabase();

      if (ativo) {
        setProfiles(database.profiles.filter((profile) => profile.is_active));
      }
    };

    atualizarHabilidades();
    const pararObservacao = observarLocalDatabase(atualizarHabilidades);

    return () => {
      ativo = false;
      pararObservacao();
    };
  }, []);

  const profileAtual = useMemo(() => {
    return profiles.find((profile) => profile.id === currentProfile?.id) ?? null;
  }, [currentProfile, profiles]);

  const pessoasDaHabilidade = useMemo(() => {
    return profiles
      .filter((profile) => profile.skills?.includes(habilidadeSelecionada))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  }, [habilidadeSelecionada, profiles]);

  function getQuantidadeHabilidade(habilidade: string) {
    return profiles.filter((profile) => profile.skills?.includes(habilidade))
      .length;
  }

  function abrirDetalhe(habilidade: string) {
    setHabilidadeSelecionada(habilidade);
    setDetalheAberto(true);
  }

  async function alternarMinhaHabilidade(habilidade: string) {
    if (!currentProfile || !habilidadesDefinidas.includes(habilidade)) {
      return;
    }

    const database = await carregarLocalDatabase();
    const profileAtualizadoExiste = database.profiles.some(
      (profile) => profile.id === currentProfile.id && profile.is_active,
    );

    if (!profileAtualizadoExiste) {
      return;
    }

    const profilesAtualizados = database.profiles.map((profile) => {
      if (profile.id !== currentProfile.id) {
        return profile;
      }

      const habilidadesAtuais = profile.skills ?? [];
      const jaRegistrado = habilidadesAtuais.includes(habilidade);

      return {
        ...profile,
        skills: jaRegistrado
          ? habilidadesAtuais.filter((item) => item !== habilidade)
          : [...habilidadesAtuais, habilidade],
        updated_at: new Date().toISOString(),
      };
    });

    await salvarLocalDatabase({
      ...database,
      profiles: profilesAtualizados,
    });
    setProfiles(profilesAtualizados.filter((profile) => profile.is_active));
  }

  const usuarioRegistrado = profileTemHabilidade(
    profileAtual,
    habilidadeSelecionada,
  );

  return (
    <div>
      <PageHeader
        title="Habilidades"
        description="Registro de competencias tecnicas dos pesquisadores."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {habilidadesDefinidas.map((habilidade) => {
          const quantidade = getQuantidadeHabilidade(habilidade);
          const registrada = profileTemHabilidade(profileAtual, habilidade);

          return (
            <Card
              key={habilidade}
              className="cursor-pointer transition hover:border-primary hover:shadow-md"
              onClick={() => abrirDetalhe(habilidade)}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-2xl font-bold text-text">{habilidade}</h3>
                <StatusBadge
                  label={`${quantidade} pessoa(s)`}
                  variant={quantidade > 0 ? "info" : "neutral"}
                />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>{registrada ? "Voce participa" : "Nao registrado"}</span>
                </div>
                <Button
                  className="min-h-9 px-3 py-2 text-sm"
                  variant={registrada ? "secondary" : "primary"}
                  onClick={(event) => {
                    event.stopPropagation();
                    alternarMinhaHabilidade(habilidade);
                  }}
                  disabled={!currentProfile}
                >
                  <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                  {registrada ? "Sair" : "Registrar"}
                </Button>
              </div>
            </Card>
          );
        })}
      </section>

      {detalheAberto ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/40 px-4 py-6 sm:items-center"
          role="dialog"
        >
          <Card className="max-h-[88vh] w-full max-w-3xl overflow-y-auto shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {habilidadeSelecionada}
                </h3>
                <p className="mt-1 text-base font-semibold text-muted">
                  Pessoas registradas nesta habilidade.
                </p>
              </div>
              <button
                type="button"
                title="Fechar"
                aria-label="Fechar habilidade"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
                onClick={() => setDetalheAberto(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <StatusBadge
                label={`${pessoasDaHabilidade.length} pessoa(s)`}
                variant={pessoasDaHabilidade.length > 0 ? "info" : "neutral"}
              />
              <Button
                className="min-h-9 px-3 py-2 text-sm"
                variant={usuarioRegistrado ? "secondary" : "primary"}
                onClick={() => alternarMinhaHabilidade(habilidadeSelecionada)}
                disabled={!currentProfile}
              >
                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                {usuarioRegistrado ? "Remover meu registro" : "Registrar-me"}
              </Button>
            </div>

            {pessoasDaHabilidade.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {pessoasDaHabilidade.map((profile) => (
                  <div
                    key={profile.id}
                    className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-lg font-bold text-text">
                        {profile.full_name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {profile.academic_affiliation}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm font-semibold text-muted">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {profile.email || "Sem correo"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {profile.phone || "Sem telefone"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-border bg-background p-4 text-base font-semibold text-muted">
                Nenhuma pessoa registrada nesta habilidade.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
