import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

import { FEEDBACK_CHANGED_EVENT } from "../components/feedback/FeedbackProvider";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  feedbackKindOptions,
  feedbackStatusOptions,
  filterFeedback,
  getFeedbackErrorMessage,
  getFeedbackKindLabel,
  getFeedbackKindVariant,
  getFeedbackStatusLabel,
  getFeedbackStatusVariant,
  sortFeedback,
  type FeedbackFilters,
  type FeedbackReport,
  type FeedbackStatus,
} from "../lib/feedback";
import { listFeedback, updateFeedback } from "../lib/supabaseRepository";

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}

function FeedbackCard({ onSaved, report }: { report: FeedbackReport; onSaved: (message?: string) => Promise<void> }) {
  const [status, setStatus] = useState<FeedbackStatus>(report.status);
  const [note, setNote] = useState(report.coordinator_note ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const alterado = status !== report.status || note.trim() !== (report.coordinator_note ?? "");

  async function salvar() {
    try {
      setSalvando(true);
      setErro("");
      await updateFeedback(report.id, { status, coordinator_note: note.trim() || null });
      await onSaved();
    } catch (error) {
      setErro(getFeedbackErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="min-w-0">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={getFeedbackKindLabel(report.kind)} variant={getFeedbackKindVariant(report.kind)} />
            <StatusBadge label={getFeedbackStatusLabel(report.status)} variant={getFeedbackStatusVariant(report.status)} />
          </div>
          <p className="text-sm text-muted">
            {report.author_name ?? "Pessoa removida"} · {formatDate(report.created_at)}
          </p>
        </div>

        <p className="whitespace-pre-wrap break-words text-base text-text">{report.message}</p>

        <p className="text-sm text-muted">
          {report.page_path ? (
            <>
              Página:{" "}
              <Link className="font-semibold text-primary underline" to={report.page_path}>
                {report.page_path}
              </Link>
            </>
          ) : null}
          {report.user_agent ? <span className="block max-w-full truncate" title={report.user_agent}>{report.user_agent}</span> : null}
        </p>

        <div className="grid items-start gap-3 border-t border-border pt-3 sm:grid-cols-[200px_1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-text">
            Situação
            <select className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
              {feedbackStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-text">
            Nota interna (só a coordenação vê)
            <textarea
              className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 py-2.5 text-base font-normal text-text outline-none transition focus:border-primary"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="sm:pt-6">
            <Button disabled={!alterado || salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
        {erro ? <p className="text-sm font-semibold text-danger">{erro}</p> : null}
      </div>
    </Card>
  );
}

export function Feedback() {
  const [reports, setReports] = useState<FeedbackReport[] | null>(null);
  const [erro, setErro] = useState("");
  const [filtros, setFiltros] = useState<FeedbackFilters>({ kind: "all", status: "pending", search: "" });

  const carregar = useCallback(async () => {
    try {
      setReports(await listFeedback());
    } catch (error) {
      setErro(getFeedbackErrorMessage(error));
      setReports((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const visiveis = useMemo(() => sortFeedback(filterFeedback(reports ?? [], filtros)), [reports, filtros]);
  const novas = (reports ?? []).filter((report) => report.status === "new").length;

  async function aoSalvar() {
    await carregar();
    window.dispatchEvent(new Event(FEEDBACK_CHANGED_EVENT));
  }

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Sugestões e erros enviados pelas pessoas do laboratório. Mude a situação e deixe uma nota interna."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_200px]">
        <input
          className={selectClassName}
          placeholder="Buscar na mensagem, pessoa ou página"
          value={filtros.search}
          onChange={(e) => setFiltros((current) => ({ ...current, search: e.target.value }))}
        />
        <select
          aria-label="Tipo"
          className={selectClassName}
          value={filtros.kind}
          onChange={(e) => setFiltros((current) => ({ ...current, kind: e.target.value as FeedbackFilters["kind"] }))}
        >
          <option value="all">Todos os tipos</option>
          {feedbackKindOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Situação"
          className={selectClassName}
          value={filtros.status}
          onChange={(e) => setFiltros((current) => ({ ...current, status: e.target.value as FeedbackFilters["status"] }))}
        >
          <option value="pending">Pendentes</option>
          <option value="all">Todas</option>
          {feedbackStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {novas > 0 ? (
        <p className="mb-4 text-base font-semibold text-warning-dark">{novas === 1 ? "1 mensagem nova." : `${novas} mensagens novas.`}</p>
      ) : null}

      {erro ? (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {reports === null && !erro ? <p className="text-lg text-muted">Carregando...</p> : null}

      {reports !== null && visiveis.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-lg font-semibold">{reports.length === 0 ? "Nenhuma mensagem ainda." : "Nada com esses filtros."}</p>
            {reports.length === 0 ? (
              <p className="text-muted">As pessoas enviam pelo botão Feedback, no canto da tela ou no menu da conta.</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        {visiveis.map((report) => (
          <FeedbackCard key={`${report.id}-${report.status}-${report.coordinator_note ?? ""}`} report={report} onSaved={aoSalvar} />
        ))}
      </div>
    </>
  );
}
