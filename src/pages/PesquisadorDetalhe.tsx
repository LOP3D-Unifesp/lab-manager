import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Mail, Pencil, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ContractViewer } from "../components/profile/ContractViewer";
import { ReadOnlyWeeklySchedule } from "../components/profile/ReadOnlyWeeklySchedule";
import { Avatar } from "../components/ui/Avatar";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateTime, getLocale, localizedName, useT } from "../i18n";
import { useAuth } from "../lib/auth";
import {
  getFundingAgencyLabel,
  getRoleLabel,
  getTotalWeeklyGrantHours,
  type AvailabilitySlot,
  type PublicProfile,
} from "../lib/domain";
import { getStatusPresenca, getVinculoLabel, type StatusPresenca } from "../lib/pesquisadores";
import { getProjectStatusLabel, getProjectStatusVariant, type ProjectDirectoryEntry } from "../lib/projects";
import {
  getGrantContracts,
  getProfile,
  listAvailability,
  listProfileSkills,
  listProjectDirectory,
  listSkills,
} from "../lib/supabaseRepository";

const presenceVariants: Record<StatusPresenca, "success" | "info" | "warning" | "neutral"> = {
  Presente: "success",
  Remoto: "info",
  "Em aula": "warning",
  Ausente: "neutral",
};

type Loaded = { profile: PublicProfile; slots: AvailabilitySlot[]; skills: string[]; projects: ProjectDirectoryEntry[]; directory: ProjectDirectoryEntry[] };

function countryName(code: string | null) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(getLocale(), { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-bold text-text">{children}</dd>
    </div>
  );
}

function formatGrantDate(value: string) {
  return formatDateTime(new Date(`${value}T00:00:00`), { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Bolsa vigente, já encerrada ou que ainda vai começar (datas "AAAA-MM-DD").
function getGrantState(grant: { start_date: string | null; end_date: string | null }, today: string): "active" | "ended" | "upcoming" {
  if (grant.end_date && grant.end_date < today) return "ended";
  if (grant.start_date && grant.start_date > today) return "upcoming";
  return "active";
}

// Perfil completo de uma pessoa do laboratório (para ler; quem edita o próprio perfil usa /perfil).
export function PesquisadorDetalhe() {
  const t = useT();
  const { id } = useParams();
  const { profile: me } = useAuth();
  // undefined: carregando; null: não encontrado.
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [error, setError] = useState("");
  // Termos de outorga ({ id da bolsa: caminho }): só a própria pessoa e os coordenadores podem ler.
  const [viewingContract, setViewingContract] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Record<string, string>>({});

  useEffect(() => {
    setContracts({});
    if (!id || !me || (me.id !== id && me.role !== "coordinator")) return;
    let ativo = true;
    getGrantContracts(id)
      .then((found) => ativo && setContracts(found))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [id, me]);

  useEffect(() => {
    if (!id) {
      setData(null);
      return undefined;
    }
    let ativo = true;
    setData(undefined);
    setError("");
    (async () => {
      const profile = await getProfile(id);
      if (!profile) return null;
      const [slots, links, skills, directory] = await Promise.all([listAvailability(id), listProfileSkills(id), listSkills(), listProjectDirectory()]);
      const mine = new Set(links.map((link) => link.skill_id));
      return {
        profile,
        slots,
        skills: skills.filter((skill) => mine.has(skill.id)).map((skill) => localizedName(skill)),
        // Projetos em que a pessoa participa (o resumo é visível para todos).
        projects: directory.filter((entry) => entry.members.some((member) => member.profile_id === id)),
        directory,
      };
    })()
      .then((loaded) => ativo && setData(loaded))
      .catch(() => {
        if (!ativo) return;
        setData(null);
        setError(t("researcher.loadError"));
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = useMemo(
    () => (data ? getStatusPresenca(data.profile.id, data.slots, new Date().getDay()) : null),
    [data],
  );

  const back = (
    <Link className="mb-3 inline-flex items-center gap-2 font-semibold text-primary" to="/pesquisadores">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t("researchers.title")}
    </Link>
  );

  if (data === undefined) {
    return (
      <>
        {back}
        <Card>
          <p className="text-lg font-semibold text-muted">{t("common.loading")}</p>
        </Card>
      </>
    );
  }

  if (data === null) {
    return (
      <>
        {back}
        <Card>
          <p className="text-lg font-bold text-text">{t("researcher.notFound")}</p>
          <p className="mt-1 text-base text-muted">{error || t("researcher.notFoundHint")}</p>
        </Card>
      </>
    );
  }

  const { directory, profile, projects, skills, slots } = data;
  const grants = profile.funding_grants;
  const grantHours = getTotalWeeklyGrantHours(grants);
  const today = new Date().toLocaleDateString("sv-SE");
  const nationality = countryName(profile.nationality_country_code);
  const isMe = me?.id === profile.id;

  return (
    <>
      {back}
      <PageHeader
        title={profile.full_name}
        description={`${getVinculoLabel(profile.academic_affiliation)} · ${getRoleLabel(profile.role)}`}
        action={
          isMe ? (
            <Link className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary" to="/perfil">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t("researcher.editMine")}
            </Link>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} className="h-20 w-20 shrink-0 text-2xl" />
            <div className="min-w-0">
              <p className="text-xl font-bold text-text">{profile.full_name}</p>
              {status ? (
                <div className="mt-2">
                  <StatusBadge label={t(`presence.${status}` as Parameters<typeof t>[0])} variant={presenceVariants[status]} />
                </div>
              ) : null}
            </div>
          </div>

          <h3 className="mb-3 mt-6 text-lg font-bold text-text">{t("researcher.contact")}</h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm font-semibold text-muted">{t("profile.email")}</dt>
              <dd className="mt-0.5 font-bold text-text">
                <a className="flex min-w-0 items-start gap-1.5 text-primary hover:text-primary-dark" href={`mailto:${profile.email}`}>
                  <Mail className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-all">{profile.email}</span>
                </a>
              </dd>
            </div>
            <Item label={t("profile.phone")}>
              {profile.phone ? (
                <a className="flex min-w-0 items-center gap-1.5 text-primary hover:text-primary-dark" href={`tel:${profile.phone}`}>
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {profile.phone}
                </a>
              ) : (
                t("common.notInformed")
              )}
            </Item>
            <Item label={t("researcher.nationality")}>{nationality ?? t("common.notInformed")}</Item>
            <Item label={t("researcher.lattes")}>
              {profile.lattes_url ? (
                <a
                  className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark"
                  href={profile.lattes_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("researcher.openLattes")}
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                t("common.notInformed")
              )}
            </Item>
          </dl>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <h3 className="mb-3 text-lg font-bold text-text">{t("researcher.about")}</h3>
          <p className="whitespace-pre-line break-words text-base text-text">{profile.bio?.trim() || t("researcher.noBio")}</p>

          <h3 className="mb-3 mt-6 text-lg font-bold text-text">{t("skills.title")}</h3>
          {skills.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li className="rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold text-text" key={skill}>
                  {skill}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted">{t("skills.none")}</p>
          )}
        </Card>

        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h3 className="text-lg font-bold text-text">{t("researcher.funding")}</h3>
            <p className="text-base text-muted">
              {t("workload.label")}:{" "}
              <span className="font-bold text-text">
                {profile.weekly_workload_hours ? t("researcher.hoursPerWeek", { hours: profile.weekly_workload_hours }) : t("common.notInformed")}
              </span>
              {grants.length > 1 && grantHours > 0 ? <span className="text-sm"> · {t("researcher.grantTotal", { hours: grantHours })}</span> : null}
            </p>
          </div>

          {grants.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {grants.map((grant, index) => {
                const project = directory.find((entry) => entry.id === grant.project_id);
                const state = getGrantState(grant, today);
                return (
                  <li className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-background p-3 sm:p-4" key={grant.id ?? index}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-words text-lg font-bold text-text">
                        {getFundingAgencyLabel(grant.agency, grant.agency_other)}
                        {grant.grant_name ? <span className="font-semibold text-muted"> · {grant.grant_name}</span> : null}
                      </p>
                      <StatusBadge label={t(`grants.state.${state}` as Parameters<typeof t>[0])} variant={state === "active" ? "success" : "neutral"} />
                    </div>
                    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                      {project ? (
                        <Item label={t("grants.project")}>
                          <Link className="text-primary hover:text-primary-dark" to={`/projetos/${project.id}`}>
                            {project.name}
                          </Link>
                        </Item>
                      ) : null}
                      {grant.weekly_hours ? <Item label={t("grants.weeklyHours")}>{t("researcher.hoursPerWeek", { hours: grant.weekly_hours })}</Item> : null}
                      {grant.start_date || grant.end_date ? (
                        <Item label={t("grants.period")}>
                          {grant.start_date ? formatGrantDate(grant.start_date) : "…"} – {grant.end_date ? formatGrantDate(grant.end_date) : "…"}
                        </Item>
                      ) : null}
                      {grant.process_number ? <Item label={t("grants.processNumber")}>{grant.process_number}</Item> : null}
                    </dl>
                    {grant.id && contracts[grant.id] ? (
                      <button
                        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
                        onClick={() => setViewingContract(contracts[grant.id as string])}
                        type="button"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {t("grants.contractOpen")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-base text-muted">{profile.weekly_workload_hours ? t("workload.volunteer") : t("researchers.noGrant")}</p>
          )}
        </Card>

        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <h3 className="mb-3 text-lg font-bold text-text">{t("researcher.projects")}</h3>
          {projects.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition hover:border-primary"
                    to={`/projetos/${project.id}`}
                  >
                    <span className="min-w-0 break-words font-bold text-text">{project.name}</span>
                    <StatusBadge label={getProjectStatusLabel(project.status)} variant={getProjectStatusVariant(project.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted">{t("researcher.noProjects")}</p>
          )}
        </Card>

        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <h3 className="mb-3 text-lg font-bold text-text">{t("profile.weeklySchedule")}</h3>
          <ReadOnlyWeeklySchedule slots={slots} />
        </Card>
      </div>
      {viewingContract ? <ContractViewer onClose={() => setViewingContract(null)} path={viewingContract} /> : null}
    </>
  );
}
