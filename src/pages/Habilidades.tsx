import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Code2,
  Cpu,
  HeartPulse,
  Mail,
  MessageCircle,
  Phone,
  Printer,
  ScanLine,
  Search,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import type { Profile, ProfileSkill, Skill } from "../lib/domain";
import {
  listProfiles,
  listProfileSkills,
  listSkills,
  toggleMySkill,
} from "../lib/supabaseRepository";

type CategoriaHabilidade = "fabricacao" | "digital" | "eletronica" | "clinica";
type FiltroCategoria = CategoriaHabilidade | "todas";

type SkillCatalogInfo = {
  category: CategoriaHabilidade;
  icon: LucideIcon;
  summary: string;
};

const categoriaLabels: Record<CategoriaHabilidade, string> = {
  fabricacao: "Fabricacao 3D",
  digital: "Design e software",
  eletronica: "Eletronica",
  clinica: "Atendimento clinico",
};

const categoriaDescriptions: Record<CategoriaHabilidade, string> = {
  fabricacao: "Operacao, manutencao e acabamento de pecas impressas.",
  digital: "Modelagem, escaneamento e desenvolvimento de ferramentas digitais.",
  eletronica: "Circuitos, sensores e programacao embarcada.",
  clinica: "Avaliacao, comunicacao e acompanhamento de pacientes.",
};

const skillCatalog: Record<string, SkillCatalogInfo> = {
  "impressao 3d": {
    category: "fabricacao",
    icon: Printer,
    summary: "Preparar arquivos, operar impressoras e acompanhar fabricacoes.",
  },
  "manutencao de impressoras 3d": {
    category: "fabricacao",
    icon: Wrench,
    summary: "Diagnosticar falhas, calibrar maquinas e executar manutencao preventiva.",
  },
  "prototipagem de orteses e proteses": {
    category: "fabricacao",
    icon: Wrench,
    summary: "Transformar requisitos clinicos em prototipos funcionais e ajustaveis.",
  },
  "modelagem 3d e cad": {
    category: "digital",
    icon: Printer,
    summary: "Criar, adaptar e preparar modelos digitais para producao.",
  },
  "escaneamento 3d": {
    category: "digital",
    icon: ScanLine,
    summary: "Capturar geometrias, limpar malhas e preparar referencias anatomicas.",
  },
  "desenvolvimento web e aplicativos": {
    category: "digital",
    icon: Code2,
    summary: "Criar paginas, apps e sistemas de apoio para o laboratorio.",
  },
  "eletronica e circuitos": {
    category: "eletronica",
    icon: Cpu,
    summary: "Montar, testar e documentar circuitos, sensores e atuadores.",
  },
  "programacao embarcada": {
    category: "eletronica",
    icon: Code2,
    summary: "Programar Arduino, microcontroladores e dispositivos conectados.",
  },
  "avaliacao fisioterapeutica": {
    category: "clinica",
    icon: HeartPulse,
    summary: "Avaliar mobilidade, dor, funcionalidade e necessidades de adaptacao.",
  },
  "acompanhamento psicologico": {
    category: "clinica",
    icon: Brain,
    summary: "Apoiar acolhimento, adesao, bem-estar e experiencia do paciente.",
  },
  "comunicacao com pacientes": {
    category: "clinica",
    icon: MessageCircle,
    summary: "Conduzir entrevistas, orientar pacientes e registrar demandas com clareza.",
  },
};

const filtrosCategoria: Array<{ id: FiltroCategoria; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "fabricacao", label: categoriaLabels.fabricacao },
  { id: "digital", label: categoriaLabels.digital },
  { id: "eletronica", label: categoriaLabels.eletronica },
  { id: "clinica", label: categoriaLabels.clinica },
];

function normalizarSkillName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getSkillInfo(skill: Skill): SkillCatalogInfo {
  return (
    skillCatalog[normalizarSkillName(skill.name)] ?? {
      category: "digital",
      icon: UserCheck,
      summary:
        skill.description ?? "Competencia cadastrada pela coordenacao do laboratorio.",
    }
  );
}

function profileTemHabilidade(
  profileId: string | undefined,
  skillId: string,
  profileSkills: ProfileSkill[],
) {
  return Boolean(
    profileId &&
      profileSkills.some(
        (item) => item.profile_id === profileId && item.skill_id === skillId,
      ),
  );
}

export function Habilidades() {
  const { currentProfile } = useCurrentProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [profileSkills, setProfileSkills] = useState<ProfileSkill[]>([]);
  const [skillSelecionada, setSkillSelecionada] = useState<Skill | null>(null);
  const [filtroCategoria, setFiltroCategoria] =
    useState<FiltroCategoria>("todas");
  const [busca, setBusca] = useState("");
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarDados() {
    const [profilesData, skillsData, profileSkillsData] = await Promise.all([
      listProfiles(),
      listSkills(),
      listProfileSkills(),
    ]);

    setProfiles(profilesData);
    setSkills(skillsData);
    setProfileSkills(profileSkillsData);
    setSkillSelecionada((current) => current ?? skillsData[0] ?? null);
  }

  useEffect(() => {
    let ativo = true;

    carregarDados().catch((error) => {
      if (ativo) {
        setErro(error instanceof Error ? error.message : "Erro ao carregar.");
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  const pessoasDaHabilidade = useMemo(() => {
    if (!skillSelecionada) {
      return [];
    }

    const profileIds = new Set(
      profileSkills
        .filter((item) => item.skill_id === skillSelecionada.id)
        .map((item) => item.profile_id),
    );

    return profiles
      .filter((profile) => profileIds.has(profile.id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  }, [profileSkills, profiles, skillSelecionada]);

  function getQuantidadeHabilidade(skillId: string) {
    return profileSkills.filter((item) => item.skill_id === skillId).length;
  }

  const skillsFiltradas = useMemo(() => {
    const termo = normalizarSkillName(busca);

    return skills.filter((skill) => {
      const info = getSkillInfo(skill);
      const textoBusca = normalizarSkillName(
        `${skill.name} ${skill.description ?? ""} ${info.summary}`,
      );

      return (
        (filtroCategoria === "todas" || info.category === filtroCategoria) &&
        (!termo || textoBusca.includes(termo))
      );
    });
  }, [busca, filtroCategoria, skills]);

  const resumoCategorias = useMemo(
    () =>
      (Object.keys(categoriaLabels) as CategoriaHabilidade[]).map((category) => {
        const skillsDaCategoria = skills.filter(
          (skill) => getSkillInfo(skill).category === category,
        );
        const pessoas = new Set(
          profileSkills
            .filter((profileSkill) =>
              skillsDaCategoria.some((skill) => skill.id === profileSkill.skill_id),
            )
            .map((profileSkill) => profileSkill.profile_id),
        );

        return {
          category,
          quantidadeSkills: skillsDaCategoria.length,
          quantidadePessoas: pessoas.size,
        };
      }),
    [profileSkills, skills],
  );

  function abrirDetalhe(skill: Skill) {
    setSkillSelecionada(skill);
    setDetalheAberto(true);
  }

  async function alternarMinhaHabilidade(skill: Skill) {
    if (!currentProfile) {
      return;
    }

    const registrada = profileTemHabilidade(
      currentProfile.id,
      skill.id,
      profileSkills,
    );

    try {
      setErro("");
      await toggleMySkill(currentProfile.id, skill.id, !registrada);
      const profileSkillsData = await listProfileSkills();
      setProfileSkills(profileSkillsData);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    }
  }

  const usuarioRegistrado = profileTemHabilidade(
    currentProfile?.id,
    skillSelecionada?.id ?? "",
    profileSkills,
  );

  return (
    <div>
      <PageHeader
        title="Habilidades"
        description="Mapa de competencias do laboratorio para impressao 3D, design, eletronica, software e atendimento a pacientes."
      />

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      {skills.length > 0 ? (
        <>
          <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {resumoCategorias.map((resumo) => (
              <button
                key={resumo.category}
                type="button"
                className={[
                  "rounded-lg border bg-surface p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md",
                  filtroCategoria === resumo.category
                    ? "border-primary"
                    : "border-border",
                ].join(" ")}
                onClick={() => setFiltroCategoria(resumo.category)}
              >
                <p className="text-sm font-bold uppercase tracking-wide text-primary">
                  {categoriaLabels[resumo.category]}
                </p>
                <p className="mt-2 text-sm leading-5 text-muted">
                  {categoriaDescriptions[resumo.category]}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge
                    label={`${resumo.quantidadeSkills} habilidade(s)`}
                    variant={resumo.quantidadeSkills > 0 ? "info" : "neutral"}
                  />
                  <StatusBadge
                    label={`${resumo.quantidadePessoas} pessoa(s)`}
                    variant={resumo.quantidadePessoas > 0 ? "success" : "neutral"}
                  />
                </div>
              </button>
            ))}
          </section>

          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-muted">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar habilidade, area ou descricao"
                className="min-h-8 w-full bg-transparent text-base font-semibold text-text outline-none placeholder:text-muted"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filtrosCategoria.map((filtro) => (
                <button
                  key={filtro.id}
                  type="button"
                  aria-pressed={filtroCategoria === filtro.id}
                  className={[
                    "inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-bold transition",
                    filtroCategoria === filtro.id
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-primary hover:bg-primary-soft",
                  ].join(" ")}
                  onClick={() => setFiltroCategoria(filtro.id)}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>

          {skillsFiltradas.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skillsFiltradas.map((skill) => {
                const info = getSkillInfo(skill);
                const Icon = info.icon;
                const quantidade = getQuantidadeHabilidade(skill.id);
                const registrada = profileTemHabilidade(
                  currentProfile?.id,
                  skill.id,
                  profileSkills,
                );

                return (
                  <Card
                    key={skill.id}
                    className="cursor-pointer transition hover:border-primary hover:shadow-md"
                    onClick={() => abrirDetalhe(skill)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-primary">
                            {categoriaLabels[info.category]}
                          </p>
                          <h3 className="mt-1 text-2xl font-bold text-text">
                            {skill.name}
                          </h3>
                        </div>
                      </div>
                      <StatusBadge
                        label={`${quantidade} pessoa(s)`}
                        variant={quantidade > 0 ? "info" : "neutral"}
                      />
                    </div>
                    {skill.description ? (
                      <p className="mt-3 text-base leading-6 text-muted">
                        {skill.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-base leading-6 text-muted">
                        {info.summary}
                      </p>
                    )}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                        <Users className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {registrada ? "Voce participa" : "Nao registrado"}
                        </span>
                      </div>
                      <Button
                        className="min-h-9 px-3 py-2 text-sm"
                        variant={registrada ? "secondary" : "primary"}
                        onClick={(event) => {
                          event.stopPropagation();
                          alternarMinhaHabilidade(skill);
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
          ) : (
            <Card>
              <p className="text-lg font-semibold text-muted">
                Nenhuma habilidade encontrada para os filtros selecionados.
              </p>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-dashed">
          <h3 className="text-2xl font-bold text-text">
            Nenhuma habilidade cadastrada ainda
          </h3>
          <p className="mt-2 text-base leading-6 text-muted">
            Quando Thabata ou a coordenacao cadastrar as habilidades no Supabase,
            elas aparecerao aqui agrupadas por area: fabricacao 3D, design,
            eletronica, software e atendimento clinico.
          </p>
        </Card>
      )}

      {detalheAberto && skillSelecionada ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/40 px-4 py-6 sm:items-center"
          role="dialog"
        >
          <Card className="max-h-[88vh] w-full max-w-3xl overflow-y-auto shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {categoriaLabels[getSkillInfo(skillSelecionada).category]}
                </p>
                <h3 className="text-2xl font-bold text-text">
                  {skillSelecionada.name}
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
                onClick={() => alternarMinhaHabilidade(skillSelecionada)}
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
                        {profile.academic_affiliation ?? "Vinculo nao informado"}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm font-semibold text-muted">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {profile.email || "Sem email"}
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
