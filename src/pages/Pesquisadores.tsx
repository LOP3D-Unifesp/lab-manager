import { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  Pesquisador,
  usePesquisadoresCadastrados,
} from "../lib/pesquisadores";

type Visualizacao = "cards" | "lista";
type Ordenacao = "alfabetica" | "vinculo" | "presenca";

export function Pesquisadores() {
  const { pesquisadores, excluirPesquisador } =
    usePesquisadoresCadastrados();
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("cards");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("alfabetica");
  const [pesquisadorParaExcluir, setPesquisadorParaExcluir] =
    useState<Pesquisador | null>(null);

  const pesquisadoresOrdenados = [...pesquisadores].sort((a, b) => {
    if (ordenacao === "vinculo") {
      return (
        a.vinculo.localeCompare(b.vinculo, "pt-BR") ||
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    }

    if (ordenacao === "presenca") {
      return (
        a.status.localeCompare(b.status, "pt-BR") ||
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    }

    return `${a.nome} ${a.sobrenome}`.localeCompare(
      `${b.nome} ${b.sobrenome}`,
      "pt-BR",
    );
  });

  const estiloCamadaPopup = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgb(16 32 51 / 0.45)",
    backdropFilter: "blur(4px)",
  } as const;

  function confirmarExclusaoPesquisador() {
    if (!pesquisadorParaExcluir) {
      return;
    }

    excluirPesquisador(pesquisadorParaExcluir.id);
    setPesquisadorParaExcluir(null);
  }

  const popupExclusao =
    pesquisadorParaExcluir && typeof document !== "undefined"
      ? createPortal(
          <div className="p-4" style={estiloCamadaPopup}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-exclusao-pesquisador"
              className="rounded-lg border border-border bg-surface p-5 text-center shadow-2xl sm:p-6"
              style={{
                width: "fit-content",
                minWidth: "320px",
                maxWidth: "92vw",
              }}
            >
              <h3
                id="titulo-exclusao-pesquisador"
                className="text-[24px] font-bold leading-tight text-text"
              >
                Excluir pesquisador?
              </h3>
              <p className="mt-2 text-base leading-6 text-muted">
                Tem certeza de que deseja excluir {pesquisadorParaExcluir.nome}{" "}
                {pesquisadorParaExcluir.sobrenome}?
              </p>
              <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
                <Button
                  variant="ghost"
                  onClick={() => setPesquisadorParaExcluir(null)}
                >
                  Cancelar
                </Button>
                <Button variant="danger" onClick={confirmarExclusaoPesquisador}>
                  Excluir pesquisador
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div>
      <PageHeader
        title="Pesquisadores"
        description="Consulta inicial de pesquisadores, vinculos academicos e presenca planejada."
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-9 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] font-semibold text-muted">
              Ordenar
              <select
                value={ordenacao}
                onChange={(event) =>
                  setOrdenacao(event.target.value as Ordenacao)
                }
                className="min-h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-semibold text-text outline-none transition focus:border-primary"
              >
                <option value="alfabetica">Ordem alfabetica</option>
                <option value="vinculo">Vinculo</option>
                <option value="presenca">Presenca</option>
              </select>
            </label>
            <div className="flex min-h-9 items-center rounded-md border border-border bg-surface p-1">
              <button
                type="button"
                title="Visualizar em cards"
                aria-label="Visualizar em cards"
                aria-pressed={visualizacao === "cards"}
                onClick={() => setVisualizacao("cards")}
                className={[
                  "inline-flex min-h-7 items-center justify-center rounded px-3 text-[12px] font-semibold transition",
                  visualizacao === "cards"
                    ? "bg-primary text-white"
                    : "text-primary hover:bg-primary-soft",
                ].join(" ")}
              >
                Cards
              </button>
              <button
                type="button"
                title="Visualizar em lista"
                aria-label="Visualizar em lista"
                aria-pressed={visualizacao === "lista"}
                onClick={() => setVisualizacao("lista")}
                className={[
                  "inline-flex min-h-7 items-center justify-center rounded px-3 text-[12px] font-semibold transition",
                  visualizacao === "lista"
                    ? "bg-primary text-white"
                    : "text-primary hover:bg-primary-soft",
                ].join(" ")}
              >
                Lista
              </button>
            </div>
          </div>
        }
      />

      {visualizacao === "cards" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pesquisadoresOrdenados.map((pesquisador) => (
            <Card key={pesquisador.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-text">
                    {pesquisador.nome} {pesquisador.sobrenome}
                  </h3>
                  <p className="mt-2 text-lg text-muted">
                    Vinculo: {pesquisador.vinculo}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-muted">
                    {pesquisador.email}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-muted">
                    {pesquisador.telefone}
                  </p>
                </div>
                <StatusBadge
                  label={pesquisador.status}
                  variant={
                    pesquisador.status === "No laboratorio" ? "success" : "info"
                  }
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  title="Excluir pesquisador"
                  aria-label={`Excluir ${pesquisador.nome} ${pesquisador.sobrenome}`}
                  onClick={() => setPesquisadorParaExcluir(pesquisador)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
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
                    Pesquisador
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    Vinculo
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    Contato
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    Presenca
                  </th>
                  <th className="w-16 px-5 py-3 text-right text-sm font-semibold text-muted">
                    Acoes
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
                      {pesquisador.nome} {pesquisador.sobrenome}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-base text-muted">
                      {pesquisador.vinculo}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold leading-5 text-muted">
                      <span className="block whitespace-nowrap">
                        {pesquisador.email}
                      </span>
                      <span className="block whitespace-nowrap">
                        {pesquisador.telefone}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusBadge
                        label={pesquisador.status}
                        variant={
                          pesquisador.status === "No laboratorio"
                            ? "success"
                            : "info"
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <button
                        type="button"
                        title="Excluir pesquisador"
                        aria-label={`Excluir ${pesquisador.nome} ${pesquisador.sobrenome}`}
                        onClick={() => setPesquisadorParaExcluir(pesquisador)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {popupExclusao}
    </div>
  );
}
