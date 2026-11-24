import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import {
  formatProjectPeriod,
  getProjectErrorMessage,
  getProjectStatusLabel,
  getProjectStatusVariant,
  isProjectOpen,
  type ProjectDirectoryEntry,
} from "../../lib/projects";
import { cancelProjectJoinRequest, requestProjectJoin } from "../../lib/supabaseRepository";
import { Alert } from "../ui/Alert";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { StatusBadge } from "../ui/StatusBadge";

type ProjectSummaryViewProps = {
  entry: ProjectDirectoryEntry;
  /** Recarrega o resumo depois de pedir ou cancelar. */
  onChanged: () => Promise<void>;
};

// Visão de quem ainda não participa do projeto: só o resumo (sem financiamento, tarefas nem compras) e o pedido de entrada.
export function ProjectSummaryView({ entry, onChanged }: ProjectSummaryViewProps) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const period = formatProjectPeriod(entry.starts_on, entry.ends_on);
  const open = isProjectOpen(entry.status);

  async function run(action: () => Promise<void>, success: string) {
    try {
      setBusy(true);
      setError("");
      setNotice("");
      await action();
      await onChanged();
      setNotice(success);
    } catch (reason) {
      setError(getProjectErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link className="mb-3 inline-flex items-center gap-2 font-semibold text-primary" to="/projetos?vista=todos">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("projects.tabAll")}
      </Link>
      <PageHeader title={entry.name} description={entry.description ?? t("projects.noDescription")} />

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-muted">{t("projects.status")}</dt>
              <dd className="mt-1">
                <StatusBadge label={getProjectStatusLabel(entry.status)} variant={getProjectStatusVariant(entry.status)} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">{t("projects.period")}</dt>
              <dd className="mt-1 font-bold">{period ?? t("common.notInformed")}</dd>
            </div>
          </dl>

          <h3 className="mb-3 mt-6 text-lg font-bold text-text">{t("join.members")}</h3>
          {entry.members.length === 0 ? (
            <p className="text-base text-muted">{t("projects.noMembers")}</p>
          ) : (
            <ul className="grid gap-2">
              {entry.members.map((member) => (
                <li className="flex items-center gap-3" key={member.profile_id}>
                  <Avatar avatarUrl={member.avatar_url} name={member.full_name} className="h-9 w-9 shrink-0" />
                  <Link className="font-semibold text-primary hover:text-primary-dark" to={`/pesquisadores/${member.profile_id}`}>
                    {member.full_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <h3 className="mb-2 text-lg font-bold text-text">{t("join.title")}</h3>
          {entry.my_request_id ? (
            <>
              <p className="text-base text-muted">{t("join.pending")}</p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void run(() => cancelProjectJoinRequest(entry.my_request_id as string), t("join.cancelled"))}
                >
                  {t("join.cancel")}
                </Button>
              </div>
            </>
          ) : !open ? (
            <p className="text-base text-muted">{t("join.closed")}</p>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await requestProjectJoin(entry.id, message);
                  setMessage("");
                }, t("join.sent"));
              }}
            >
              <p className="text-base text-muted">{t("join.intro")}</p>
              <label className="grid gap-1 text-base font-semibold text-text">
                {t("join.messageLabel")}
                <textarea
                  className="min-h-24 rounded-lg border border-border bg-surface px-4 py-2 text-base font-normal outline-none transition focus:border-primary"
                  maxLength={300}
                  placeholder={t("join.messagePlaceholder")}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              <div>
                <Button disabled={busy} type="submit">
                  {busy ? t("join.sending") : t("join.send")}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
