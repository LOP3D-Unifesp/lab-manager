import { getLocale, useT } from "../i18n";
import { useState } from "react";
import { UserPlus } from "lucide-react";
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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pesquisadoresOrdenados.map((pesquisador) => (
            <Card key={pesquisador.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    avatarUrl={pesquisador.avatarUrl}
                    name={`${pesquisador.nome} ${pesquisador.sobrenome}`}
                    className="h-12 w-12 shrink-0"
                  />
                  <div>
                  <h3 className="text-2xl font-bold text-text">
                    {pesquisador.nome} {pesquisador.sobrenome}
                  </h3>
                  <p className="mt-2 text-lg text-muted">
                    {t("researchers.affiliationLine", { value: pesquisador.vinculo })}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-muted">
                    {pesquisador.email}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-muted">
                    {pesquisador.telefone || t("researchers.noPhone")}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-muted">
                    {pesquisador.bolsasFomento.length > 0
                      ? t("researchers.grantsLong", { list: pesquisador.bolsasFomento.join(", ") })
                      : pesquisador.cargaHorariaSemanal
                        ? t("researchers.volunteer")
                        : t("researchers.noGrant")}
                    {pesquisador.cargaHorariaSemanal
                      ? t("researchers.hoursWeek", { hours: pesquisador.cargaHorariaSemanal })
                      : ""}
                  </p>
                  {pesquisador.lattesUrl ? (
                    <a
                      className="mt-2 inline-flex text-sm font-bold text-primary hover:text-primary-dark"
                      href={pesquisador.lattesUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Lattes
                    </a>
                  ) : null}
                  </div>
                </div>
                <StatusBadge
                  label={t(`presence.${pesquisador.status}` as Parameters<typeof t>[0])}
                  variant={getStatusVariant(pesquisador.status)}
                />
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead className="bg-background text-left">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colResearcher")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colAffiliation")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colContact")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colPresence")}
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    {t("researchers.colFunding")}
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
                        {pesquisador.nome} {pesquisador.sobrenome}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-base text-muted">
                      {pesquisador.vinculo}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold leading-5 text-muted">
                      <span className="block whitespace-nowrap">
                        {pesquisador.email}
                      </span>
                      <span className="block whitespace-nowrap">
                        {pesquisador.telefone || t("researchers.noPhone")}
                      </span>
                      {pesquisador.lattesUrl ? (
                        <a
                          className="block whitespace-nowrap text-primary hover:text-primary-dark"
                          href={pesquisador.lattesUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Lattes
                        </a>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusBadge
                        label={t(`presence.${pesquisador.status}` as Parameters<typeof t>[0])}
                        variant={getStatusVariant(pesquisador.status)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-base text-muted">
                      {pesquisador.bolsasFomento.length > 0
                        ? t("researchers.grantsShort", { list: pesquisador.bolsasFomento.join(", ") })
                        : pesquisador.cargaHorariaSemanal
                          ? t("researchers.volunteer")
                          : t("researchers.noGrant")}
                      {pesquisador.cargaHorariaSemanal
                        ? t("researchers.hoursShort", { hours: pesquisador.cargaHorariaSemanal })
                        : ""}
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
