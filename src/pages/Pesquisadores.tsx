import { getLocale, useT } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import { usePesquisadoresCadastrados, type StatusPresenca } from "../lib/pesquisadores";

type Visualizacao = "cards" | "lista";
type Ordenacao = "alfabetica" | "vinculo" | "presenca";
const TODOS_VINCULOS = "Todos";

function getStatusVariant(status: StatusPresenca) {
  const variants: Record<StatusPresenca, "success" | "info" | "warning" | "neutral"> = {
    Presente: "success",
    Remoto: "info",
    "Em aula": "warning",
    Ausente: "neutral",
  };

  return variants[status];
}

// Copia o e-mail para a área de transferência e mostra um "ok" por 2 segundos.
function CopyEmailButton({ email }: { email: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Sem permissão da área de transferência: nada a mostrar; o e-mail continua selecionável para o Ctrl+C.
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  const label = copied ? t("researchers.emailCopied") : t("researchers.copyEmail");
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
      onClick={copy}
      title={label}
      type="button"
    >
      {copied ? <Check className="h-4 w-4 text-success-dark" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite" className="sr-only">
        {copied ? label : ""}
      </span>
    </button>
  );
}

export function Pesquisadores() {
  const t = useT();
  const { pesquisadores } = usePesquisadoresCadastrados();
  const { currentProfile } = useCurrentProfile();
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("cards");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("alfabetica");
  const [vinculoFiltro, setVinculoFiltro] = useState(TODOS_VINCULOS);

  const vinculosDisponiveis = [
    TODOS_VINCULOS,
    ...Array.from(new Set(pesquisadores.map((pesquisador) => pesquisador.vinculo))).sort((a, b) =>
      a.localeCompare(b, getLocale()),
    ),
  ];

  const pesquisadoresFiltrados =
    vinculoFiltro === TODOS_VINCULOS
      ? pesquisadores
      : pesquisadores.filter((pesquisador) => pesquisador.vinculo === vinculoFiltro);

  const pesquisadoresOrdenados = [...pesquisadoresFiltrados].sort((a, b) => {
    if (ordenacao === "vinculo") {
      return (
        a.vinculo.localeCompare(b.vinculo, getLocale()) ||
        a.nome.localeCompare(b.nome, getLocale())
      );
    }

    if (ordenacao === "presenca") {
      return (
        a.status.localeCompare(b.status, getLocale()) ||
        a.nome.localeCompare(b.nome, getLocale())
      );
    }

    return `${a.nome} ${a.sobrenome}`.localeCompare(
      `${b.nome} ${b.sobrenome}`,
      getLocale(),
    );
  });

  return (
    <div>
      <PageHeader
        title={t("researchers.title")}
        description={t("researchers.subtitle")}
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-9 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] font-semibold text-muted">
              {t("researchers.sort")}
              <select
                value={ordenacao}
                onChange={(event) =>
                  setOrdenacao(event.target.value as Ordenacao)
                }
                className="min-h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-semibold text-text outline-none transition focus:border-primary"
              >
                <option value="alfabetica">{t("researchers.sortAlpha")}</option>
                <option value="vinculo">{t("researchers.sortAffiliation")}</option>
                <option value="presenca">{t("researchers.sortPresence")}</option>
              </select>
            </label>
            <label className="flex min-h-9 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] font-semibold text-muted">
              {t("researchers.affiliation")}
              <select
                value={vinculoFiltro}
                onChange={(event) => setVinculoFiltro(event.target.value)}
                className="min-h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-semibold text-text outline-none transition focus:border-primary"
              >
                {vinculosDisponiveis.map((vinculo) => (
                  <option key={vinculo} value={vinculo}>
                    {vinculo === TODOS_VINCULOS ? t("researchers.all") : vinculo}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-h-9 items-center rounded-md border border-border bg-surface p-1">
              <button
                type="button"
                title={t("researchers.viewCards")}
                aria-label={t("researchers.viewCards")}
                aria-pressed={visualizacao === "cards"}
                onClick={() => setVisualizacao("cards")}
                className={[
                  "inline-flex min-h-7 items-center justify-center rounded px-3 text-[12px] font-semibold transition",
                  visualizacao === "cards"
                    ? "bg-primary text-white"
                    : "text-primary hover:bg-primary-soft",
                ].join(" ")}
              >
                {t("researchers.cards")}
              </button>
              <button
                type="button"
                title={t("researchers.viewList")}
                aria-label={t("researchers.viewList")}
                aria-pressed={visualizacao === "lista"}
                onClick={() => setVisualizacao("lista")}
                className={[
                  "inline-flex min-h-7 items-center justify-center rounded px-3 text-[12px] font-semibold transition",
                  visualizacao === "lista"
                    ? "bg-primary text-white"
                    : "text-primary hover:bg-primary-soft",
                ].join(" ")}
              >
                {t("researchers.list")}
              </button>
            </div>
            {currentProfile?.role === "coordinator" ? (
              <Link to="/usuarios/convites">
                <Button fullWidth variant="secondary">
                  <UserPlus className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t("researchers.manageInvites")}
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {pesquisadoresOrdenados.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold text-muted">
            {t("researchers.none")}
          </p>
        </Card>
      ) : visualizacao === "cards" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pesquisadoresOrdenados.map((pesquisador) => {
            const nomeCompleto = `${pesquisador.nome} ${pesquisador.sobrenome}`;
            return (
              // O cartão inteiro leva ao perfil por um link esticado sobre o nome; o e-mail fica acima dele (z-10) para
              // poder ser selecionado e copiado sem abrir o perfil.
              <Card
                className="group relative flex h-full min-w-0 flex-col gap-3 p-4 transition hover:border-primary hover:shadow-md sm:p-5"
                key={pesquisador.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar avatarUrl={pesquisador.avatarUrl} name={nomeCompleto} className="h-14 w-14 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold leading-snug text-text">
                      <Link
                        aria-label={t("researchers.openProfile", { name: nomeCompleto })}
                        className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-offset-2"
                        to={`/pesquisadores/${pesquisador.id}`}
                      >
                        {nomeCompleto}
                      </Link>
                    </h3>
                    <p className="mt-0.5 break-words text-sm text-muted">{pesquisador.vinculo}</p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
                  <div className="relative z-10 flex min-w-0 flex-1 basis-40 items-center gap-1">
                    <span className="min-w-0 select-text truncate text-sm font-semibold text-muted" title={pesquisador.email}>
                      {pesquisador.email}
                    </span>
                    <CopyEmailButton email={pesquisador.email} />
                  </div>
                  <StatusBadge
                    label={t(`presence.${pesquisador.status}` as Parameters<typeof t>[0])}
                    variant={getStatusVariant(pesquisador.status)}
                  />
                </div>
              </Card>
            );
          })}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-background text-left">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colResearcher")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colAffiliation")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colEmail")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colPresence")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pesquisadoresOrdenados.map((pesquisador) => (
                  <tr
                    key={pesquisador.id}
                    className="border-b border-border last:border-b-0 hover:bg-background/70"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-base font-semibold text-text">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          avatarUrl={pesquisador.avatarUrl}
                          name={`${pesquisador.nome} ${pesquisador.sobrenome}`}
                          className="h-8 w-8 shrink-0 text-xs"
                        />
                        <Link className="text-primary hover:text-primary-dark" to={`/pesquisadores/${pesquisador.id}`}>
                          {pesquisador.nome} {pesquisador.sobrenome}
                        </Link>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-base text-muted">
                      {pesquisador.vinculo}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-muted">
                      {pesquisador.email}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusBadge
                        label={t(`presence.${pesquisador.status}` as Parameters<typeof t>[0])}
                        variant={getStatusVariant(pesquisador.status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
