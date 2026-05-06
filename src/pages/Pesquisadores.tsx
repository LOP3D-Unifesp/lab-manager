import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, UserPlus, X } from "lucide-react";
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

const vinculos = ["IC", "Mestrado", "Doutorado", "Pós-doutorado", "Docente"];
const presencas = ["No laboratório", "Remoto"];

export function Pesquisadores() {
  const { pesquisadores, adicionarPesquisador, excluirPesquisador } =
    usePesquisadoresCadastrados();
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("cards");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("alfabetica");
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [pesquisadorParaExcluir, setPesquisadorParaExcluir] =
    useState<Pesquisador | null>(null);
  const [novoPesquisador, setNovoPesquisador] = useState({
    nome: "",
    sobrenome: "",
    vinculo: vinculos[0],
    status: presencas[0],
  });

  const salvarNovoPesquisador = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = novoPesquisador.nome.trim();
    const sobrenome = novoPesquisador.sobrenome.trim();

    if (!nome || !sobrenome) {
      return;
    }

    adicionarPesquisador({
      nome,
      sobrenome,
      vinculo: novoPesquisador.vinculo,
      status: novoPesquisador.status,
    });
    setNovoPesquisador({
      nome: "",
      sobrenome: "",
      vinculo: vinculos[0],
      status: presencas[0],
    });
    setModalCadastroAberto(false);
  };

  const confirmarExclusaoPesquisador = () => {
    if (!pesquisadorParaExcluir) {
      return;
    }

    excluirPesquisador(pesquisadorParaExcluir.id);
    setPesquisadorParaExcluir(null);
  };

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

  const popupCadastro =
    modalCadastroAberto && typeof document !== "undefined"
      ? createPortal(
          <div className="p-4" style={estiloCamadaPopup}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-cadastro-pesquisador"
              className="rounded-lg border border-border bg-surface px-8 py-7 text-center shadow-2xl sm:px-10 sm:py-9"
              style={{
                boxSizing: "border-box",
                padding: "2.25rem 3rem",
                width: "min(94vw, 760px)",
              }}
            >
              <div className="mb-5 flex items-start justify-between gap-4 text-left">
                <div>
                  <h3
                    id="titulo-cadastro-pesquisador"
                    className="text-[24px] font-bold leading-tight text-text"
                  >
                    Adicionar pesquisador
                  </h3>
                  <p className="mt-1.5 text-base leading-6 text-muted">
                    Informe os dados principais do pesquisador.
                  </p>
                </div>
                <button
                  type="button"
                  title="Fechar"
                  aria-label="Fechar cadastro"
                  onClick={() => setModalCadastroAberto(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <form
                className="grid gap-4 text-left"
                onSubmit={salvarNovoPesquisador}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Nome
                    <input
                      value={novoPesquisador.nome}
                      onChange={(event) =>
                        setNovoPesquisador((pesquisador) => ({
                          ...pesquisador,
                          nome: event.target.value,
                        }))
                      }
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Sobrenome
                    <input
                      value={novoPesquisador.sobrenome}
                      onChange={(event) =>
                        setNovoPesquisador((pesquisador) => ({
                          ...pesquisador,
                          sobrenome: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-base font-semibold text-text">
                  Vínculo
                  <select
                    value={novoPesquisador.vinculo}
                    onChange={(event) =>
                      setNovoPesquisador((pesquisador) => ({
                        ...pesquisador,
                        vinculo: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                  >
                    {vinculos.map((vinculo) => (
                      <option key={vinculo}>{vinculo}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-base font-semibold text-text">
                  Presença
                  <select
                    value={novoPesquisador.status}
                    onChange={(event) =>
                      setNovoPesquisador((pesquisador) => ({
                        ...pesquisador,
                        status: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                  >
                    {presencas.map((presenca) => (
                      <option key={presenca}>{presenca}</option>
                    ))}
                  </select>
                </label>
                <div
                  className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    width: "100%",
                  }}
                >
                  <Button
                    variant="ghost"
                    className="min-h-9 px-3 py-2 text-base"
                    onClick={() => setModalCadastroAberto(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-9 px-3 py-2 text-base"
                  >
                    Salvar pesquisador
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

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
        description="Consulta inicial de pesquisadores, vínculos acadêmicos e presença planejada."
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
                <option value="alfabetica">Ordem alfabética</option>
                <option value="vinculo">Vínculo</option>
                <option value="presenca">Presença</option>
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
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setModalCadastroAberto(true)}
            >
              <UserPlus className="mr-2 h-5 w-5" aria-hidden="true" />
              Adicionar pesquisador
            </Button>
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
                    Vínculo: {pesquisador.vinculo}
                  </p>
                </div>
                <StatusBadge
                  label={pesquisador.status}
                  variant={
                    pesquisador.status === "No laboratório" ? "success" : "info"
                  }
                />
              </div>
              <div
                className="mt-5"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: "100%",
                }}
              >
                <button
                  type="button"
                  title="Excluir pesquisador"
                  aria-label={`Excluir ${pesquisador.nome} ${pesquisador.sobrenome}`}
                  onClick={() => setPesquisadorParaExcluir(pesquisador)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
                  style={{ marginLeft: "auto" }}
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
                    Vínculo
                  </th>
                  <th className="px-5 py-3 text-sm font-semibold text-muted">
                    Presença
                  </th>
                  <th className="w-16 px-5 py-3 text-right text-sm font-semibold text-muted">
                    Ações
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
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusBadge
                        label={pesquisador.status}
                        variant={
                          pesquisador.status === "No laboratório"
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

      {popupCadastro}
      {popupExclusao}
    </div>
  );
}
