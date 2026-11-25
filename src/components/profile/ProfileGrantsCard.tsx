import { Landmark, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { t } from "../../i18n";
import { validateGrant, type FundingGrant } from "../../lib/domain";
import type { ProjectDirectoryEntry } from "../../lib/projects";
import { listProjectDirectory, replaceMyFundingGrants, requestProjectJoin } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FundingGrantsEditor } from "./FundingGrantsEditor";

type ProfileGrantsCardProps = {
  profileId: string;
  /** Bolsas já salvas. */
  saved: FundingGrant[];
  /** Chamado depois de salvar, para recarregar o perfil. */
  onSaved: () => Promise<void> | void;
};

const CLOSED_PROJECT_STATUSES = ["completed", "archived"];

// Cartão das bolsas de fomento, com o próprio botão Salvar (não depende do "Salvar" do perfil).
export function ProfileGrantsCard({ onSaved, profileId, saved }: ProfileGrantsCardProps) {
  const [draft, setDraft] = useState<FundingGrant[]>(saved);
  const [directory, setDirectory] = useState<ProjectDirectoryEntry[]>([]);
  const [joiningProjectId, setJoiningProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Quando o perfil é recarregado (depois de salvar), o rascunho passa a ser o que ficou salvo.
  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  useEffect(() => {
    let active = true;
    listProjectDirectory()
      .then((entries) => {
        if (active) setDirectory(entries);
      })
      .catch(() => {
        if (active) setError(t("grants.errProjects"));
      });
    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // Projetos abertos, mais os que já estão escolhidos nas bolsas (mesmo que tenham fechado depois).
  const projects = useMemo(() => {
    const chosen = new Set(draft.map((grant) => grant.project_id));
    return directory
      .filter((project) => !CLOSED_PROJECT_STATUSES.includes(project.status) || chosen.has(project.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [directory, draft]);

  function change(grants: FundingGrant[]) {
    setDraft(grants);
    setSuccess("");
    setError("");
  }

  async function requestJoin(projectId: string) {
    setJoiningProjectId(projectId);
    setError("");
    try {
      await requestProjectJoin(projectId, "");
      setDirectory((entries) => entries.map((entry) => (entry.id === projectId ? { ...entry, my_request_status: "pending" } : entry)));
    } catch {
      setError(t("grants.errJoin"));
    } finally {
      setJoiningProjectId(null);
    }
  }

  async function save() {
    setError("");
    setSuccess("");

    for (const [index, grant] of draft.entries()) {
      const issue = validateGrant(grant);
      if (issue) {
        setError(t("grants.errInvalid", { n: index + 1, problem: t(`grants.err.${issue}` as Parameters<typeof t>[0]) }));
        return;
      }
    }

    setSaving(true);
    try {
      await replaceMyFundingGrants(profileId, draft);
      await onSaved();
      setSuccess(t("grants.saved"));
    } catch {
      setError(t("grants.errSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    // Este cartão fica dentro do formulário do perfil: Enter num campo não deve enviar o formulário inteiro.
    <div
      className="min-w-0"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
    >
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Landmark className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-text">{t("grants.title")}</h2>
          <p className="mt-1 text-base text-muted">{t("grants.hint")}</p>
        </div>
      </div>

      <FundingGrantsEditor
        disabled={saving}
        joiningProjectId={joiningProjectId}
        onChange={change}
        onRequestJoin={requestJoin}
        projects={projects}
        value={draft}
      />

      {error ? <p className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{error}</p> : null}
      {success && !dirty ? (
        <p className="mt-4 rounded-lg border border-success bg-success-soft p-3 text-base font-semibold text-success-dark">{success}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {dirty ? <span className="text-sm font-semibold text-warning-dark">{t("grants.unsaved")}</span> : null}
        <Button disabled={saving || !dirty} onClick={save}>
          <Save className="mr-2 h-5 w-5" aria-hidden="true" />
          {saving ? t("common.saving") : t("grants.save")}
        </Button>
      </div>
    </Card>
    </div>
  );
}
