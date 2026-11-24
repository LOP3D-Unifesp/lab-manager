import { getLocale, t } from "../i18n";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Phone, Plus, UserCheck, Users, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import type { PublicProfile, ProfileSkill, Skill } from "../lib/domain";
import {
  createSkill,
  listProfiles,
  listProfileSkills,
  listSkills,
  toggleMySkill,
  updateSkill,
} from "../lib/supabaseRepository";

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
  const isCoordinator = currentProfile?.role === "coordinator";
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [profileSkills, setProfileSkills] = useState<ProfileSkill[]>([]);
  const [skillSelecionada, setSkillSelecionada] = useState<Skill | null>(null);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [gerenciamentoAberto, setGerenciamentoAberto] = useState(false);
  const [skillEmEdicao, setSkillEmEdicao] = useState<Skill | null>(null);
  const [skillForm, setSkillForm] = useState({ name: "", description: "", isActive: true });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    const [profilesData, skillsData, profileSkillsData] = await Promise.all([
      listProfiles(),
      listSkills(isCoordinator),
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
        setErro(error instanceof Error ? error.message : t("skills.errLoad"));
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  function abrirCadastro() {
    setSkillEmEdicao(null);
    setSkillForm({ name: "", description: "", isActive: true });
    setErro("");
    setGerenciamentoAberto(true);
  }

  function abrirEdicao(skill: Skill) {
    setSkillEmEdicao(skill);
    setSkillForm({
      name: skill.name,
      description: skill.description ?? "",
      isActive: skill.is_active,
    });
    setErro("");
    setGerenciamentoAberto(true);
  }

  function fecharGerenciamento() {
    setGerenciamentoAberto(false);
    setSkillEmEdicao(null);
    setErro("");
  }

  async function salvarSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = skillForm.name.trim();
    if (!name) {
      setErro(t("skills.errName"));
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      if (skillEmEdicao) {
        await updateSkill(skillEmEdicao.id, {
          name,
          description: skillForm.description.trim() || null,
          isActive: skillForm.isActive,
        });
      } else {
        await createSkill({
          name,
          description: skillForm.description.trim() || null,
        });
      }
      await carregarDados();
      setSucesso(skillEmEdicao ? t("skills.updated") : t("skills.created"));
      fecharGerenciamento();
    } catch (error) {
      setErro(error instanceof Error ? error.message : t("skills.errSave"));
    } finally {
      setSalvando(false);
    }
  }

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
      .sort((a, b) => a.full_name.localeCompare(b.full_name, getLocale()));
  }, [profileSkills, profiles, skillSelecionada]);

  function getQuantidadeHabilidade(skillId: string) {
    return profileSkills.filter((item) => item.skill_id === skillId).length;
  }

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
      setErro(error instanceof Error ? error.message : t("skills.errSave"));
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
        title={t("skills.title")}
        description={t("skills.subtitle")}
        action={isCoordinator ? (
          <Button fullWidth onClick={abrirCadastro}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("skills.new")}
          </Button>
        ) : undefined}
      />

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      {sucesso ? (
        <p className="mb-5 rounded-lg border border-success bg-success-soft p-3 text-base font-semibold text-success">
          {sucesso}
        </p>
      ) : null}

      {skills.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => {
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
                  <h3 className="text-2xl font-bold text-text">{skill.name}</h3>
                  <StatusBadge
                    label={skill.is_active ? t("skills.peopleCount", { count: quantidade }) : t("skills.inactive")}
                    variant={!skill.is_active ? "neutral" : quantidade > 0 ? "info" : "neutral"}
                  />
                </div>
                {skill.description ? (
                  <p className="mt-3 text-base leading-6 text-muted">
                    {skill.description}
                  </p>
                ) : null}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {registrada ? t("skills.youTakePart") : t("skills.notRegistered")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {isCoordinator ? (
                      <Button
                        className="min-h-9 px-3 py-2 text-sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirEdicao(skill);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t("skills.editButton")}
                      </Button>
                    ) : null}
                    <Button
                      className="min-h-9 px-3 py-2 text-sm"
                      variant={registrada ? "secondary" : "primary"}
                      onClick={(event) => {
                        event.stopPropagation();
                        alternarMinhaHabilidade(skill);
                      }}
                      disabled={!currentProfile || !skill.is_active}
                    >
                      <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                      {registrada ? t("skills.leave") : t("skills.register")}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      ) : (
        <Card>
          <p className="text-lg font-semibold text-muted">
            {t("skills.none")}
          </p>
          {isCoordinator ? (
            <Button className="mt-4" onClick={abrirCadastro}>
              {t("skills.registerFirst")}
            </Button>
          ) : (
            <p className="mt-2 text-base text-muted">
              {t("skills.askCoordinator")}
            </p>
          )}
        </Card>
      )}

      {gerenciamentoAberto && isCoordinator ? (
        <Modal sheet title={skillEmEdicao ? t("skills.edit") : t("skills.new")} description={t("skills.formHint")} onClose={fecharGerenciamento}>

            <form className="mt-5 grid gap-4" onSubmit={salvarSkill}>
              <label className="grid gap-2 font-semibold text-text">
                {t("skills.name")}
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal"
                  value={skillForm.name}
                  onChange={(event) => setSkillForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 font-semibold text-text">
                {t("skills.description")}
                <textarea
                  className="min-h-24 rounded-lg border border-border bg-background px-4 py-3 font-normal"
                  value={skillForm.description}
                  onChange={(event) => setSkillForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              {skillEmEdicao ? (
                <label className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 font-semibold text-text">
                  <input
                    type="checkbox"
                    checked={skillForm.isActive}
                    onChange={(event) => setSkillForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  {t("skills.active")}
                </label>
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={fecharGerenciamento}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={salvando}>
                  {salvando ? t("common.saving") : t("skills.save")}
                </Button>
              </div>
            </form>
          </Modal>
      ) : null}

      {detalheAberto && skillSelecionada ? (
        <Modal sheet wide title={skillSelecionada.name} description={t("skills.detailHint")} onClose={() => setDetalheAberto(false)}>

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
                {usuarioRegistrado ? t("skills.removeMine") : t("skills.registerMe")}
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
                        {profile.academic_affiliation ?? t("skills.affiliationUnknown")}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm font-semibold text-muted">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {profile.email || t("skills.noEmail")}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {profile.phone || t("skills.noPhone")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-border bg-background p-4 text-base font-semibold text-muted">
                {t("skills.nobody")}
              </p>
            )}
          </Modal>
      ) : null}
    </div>
  );
}
