import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  carregarLocalDatabase,
  criarLocalPrinter,
  observarLocalDatabase,
  salvarLocalDatabase,
  type LocalPrinter,
} from "../lib/localDatabase";

const filamentosDisponiveis = ["PLA", "PETG", "ABS", "TPU", "PA", "Resina"];

type ImpressoraForm = {
  name: string;
  model: string;
  brand: string;
  dimensions: string;
  allowed_filaments: string[];
  status: LocalPrinter["status"];
};

export function Impressoras() {
  const [impressoras, setImpressoras] = useState<LocalPrinter[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [impressoraEmEdicao, setImpressoraEmEdicao] =
    useState<LocalPrinter | null>(null);
  const [novaImpressora, setNovaImpressora] = useState({
    name: "",
    model: "",
    brand: "",
    dimensions: "",
    allowed_filaments: [] as string[],
  });
  const [edicaoImpressora, setEdicaoImpressora] = useState<ImpressoraForm>({
    name: "",
    model: "",
    brand: "",
    dimensions: "",
    allowed_filaments: [],
    status: "Ativa",
  });

  useEffect(() => {
    let ativo = true;

    const atualizarImpressoras = async () => {
      const database = await carregarLocalDatabase();

      if (ativo) {
        setImpressoras(database.printers);
      }
    };

    atualizarImpressoras();
    const pararObservacao = observarLocalDatabase(atualizarImpressoras);

    return () => {
      ativo = false;
      pararObservacao();
    };
  }, []);

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

  function toggleFilamento(filamento: string) {
    setNovaImpressora((impressora) => {
      const jaSelecionado =
        impressora.allowed_filaments.includes(filamento);

      return {
        ...impressora,
        allowed_filaments: jaSelecionado
          ? impressora.allowed_filaments.filter((item) => item !== filamento)
          : [...impressora.allowed_filaments, filamento],
      };
    });
  }

  function toggleFilamentoEdicao(filamento: string) {
    setEdicaoImpressora((impressora) => {
      const jaSelecionado = impressora.allowed_filaments.includes(filamento);

      return {
        ...impressora,
        allowed_filaments: jaSelecionado
          ? impressora.allowed_filaments.filter((item) => item !== filamento)
          : [...impressora.allowed_filaments, filamento],
      };
    });
  }

  function abrirEdicaoImpressora(impressora: LocalPrinter) {
    setImpressoraEmEdicao(impressora);
    setEdicaoImpressora({
      name: impressora.name,
      model: impressora.model,
      brand: impressora.brand,
      dimensions: impressora.dimensions,
      allowed_filaments: impressora.allowed_filaments,
      status: impressora.status,
    });
  }

  function fecharEdicaoImpressora() {
    setImpressoraEmEdicao(null);
  }

  async function salvarNovaImpressora(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = novaImpressora.name.trim();
    const model = novaImpressora.model.trim();
    const brand = novaImpressora.brand.trim();
    const dimensions = novaImpressora.dimensions.trim();

    if (!name || !model || !brand || !dimensions) {
      return;
    }

    const database = await carregarLocalDatabase();

    if (
      database.printers.some(
        (impressora) => impressora.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      return;
    }

    const printer = criarLocalPrinter({
      name,
      model,
      brand,
      dimensions,
      allowed_filaments: novaImpressora.allowed_filaments,
    });

    await salvarLocalDatabase({
      ...database,
      printers: [...database.printers, printer],
    });
    setImpressoras((listaAtual) => [...listaAtual, printer]);
    setNovaImpressora({
      name: "",
      model: "",
      brand: "",
      dimensions: "",
      allowed_filaments: [],
    });
    setModalAberto(false);
  }

  async function salvarEdicaoImpressora(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!impressoraEmEdicao) {
      return;
    }

    const name = edicaoImpressora.name.trim();
    const model = edicaoImpressora.model.trim();
    const brand = edicaoImpressora.brand.trim();
    const dimensions = edicaoImpressora.dimensions.trim();

    if (!name || !model || !brand || !dimensions) {
      return;
    }

    const database = await carregarLocalDatabase();

    if (
      database.printers.some(
        (impressora) =>
          impressora.id !== impressoraEmEdicao.id &&
          impressora.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      return;
    }

    const impressoraAtualizada: LocalPrinter = {
      ...impressoraEmEdicao,
      name,
      model,
      brand,
      dimensions,
      allowed_filaments: edicaoImpressora.allowed_filaments,
      status: edicaoImpressora.status,
      updated_at: new Date().toISOString(),
    };

    await salvarLocalDatabase({
      ...database,
      printers: database.printers.map((impressora) =>
        impressora.id === impressoraAtualizada.id
          ? impressoraAtualizada
          : impressora,
      ),
    });
    setImpressoras((listaAtual) =>
      listaAtual.map((impressora) =>
        impressora.id === impressoraAtualizada.id
          ? impressoraAtualizada
          : impressora,
      ),
    );
    fecharEdicaoImpressora();
  }

  const popupCadastro =
    modalAberto && typeof document !== "undefined"
      ? createPortal(
          <div className="p-4" style={estiloCamadaPopup}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-cadastro-impressora"
              className="rounded-lg border border-border bg-surface px-8 py-7 text-left shadow-2xl sm:px-10 sm:py-9"
              style={{
                boxSizing: "border-box",
                padding: "2.25rem 3rem",
                width: "min(94vw, 820px)",
              }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="titulo-cadastro-impressora"
                    className="text-[24px] font-bold leading-tight text-text"
                  >
                    Cadastrar impressora
                  </h3>
                  <p className="mt-1.5 text-base leading-6 text-muted">
                    Informe os dados principais e os filamentos permitidos.
                  </p>
                </div>
                <button
                  type="button"
                  title="Fechar"
                  aria-label="Fechar cadastro"
                  onClick={() => setModalAberto(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <form className="grid gap-4" onSubmit={salvarNovaImpressora}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Nome
                    <input
                      value={novaImpressora.name}
                      onChange={(event) =>
                        setNovaImpressora((impressora) => ({
                          ...impressora,
                          name: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Modelo
                    <input
                      value={novaImpressora.model}
                      onChange={(event) =>
                        setNovaImpressora((impressora) => ({
                          ...impressora,
                          model: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Marca
                    <input
                      value={novaImpressora.brand}
                      onChange={(event) =>
                        setNovaImpressora((impressora) => ({
                          ...impressora,
                          brand: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Dimensoes
                    <input
                      value={novaImpressora.dimensions}
                      onChange={(event) =>
                        setNovaImpressora((impressora) => ({
                          ...impressora,
                          dimensions: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      placeholder="Ex.: 250 x 210 x 220 mm"
                      required
                    />
                  </label>
                </div>

                <fieldset className="grid gap-3 rounded-lg border border-border bg-background p-4">
                  <legend className="px-1 text-base font-semibold text-text">
                    Filamentos permitidos
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {filamentosDisponiveis.map((filamento) => {
                      const selecionado =
                        novaImpressora.allowed_filaments.includes(filamento);

                      return (
                        <label
                          key={filamento}
                          className={[
                            "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
                            selecionado
                              ? "border-primary bg-primary-soft text-primary-dark"
                              : "border-border bg-surface text-muted hover:border-primary",
                          ].join(" ")}
                        >
                          <input
                            checked={selecionado}
                            className="h-4 w-4 accent-primary"
                            onChange={() => toggleFilamento(filamento)}
                            type="checkbox"
                          />
                          {filamento}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    className="min-h-9 px-3 py-2 text-base"
                    onClick={() => setModalAberto(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-9 px-3 py-2 text-base"
                  >
                    Salvar impressora
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  const popupEdicao =
    impressoraEmEdicao && typeof document !== "undefined"
      ? createPortal(
          <div className="p-4" style={estiloCamadaPopup}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-edicao-impressora"
              className="rounded-lg border border-border bg-surface px-8 py-7 text-left shadow-2xl sm:px-10 sm:py-9"
              style={{
                boxSizing: "border-box",
                padding: "2.25rem 3rem",
                width: "min(94vw, 820px)",
              }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="titulo-edicao-impressora"
                    className="text-[24px] font-bold leading-tight text-text"
                  >
                    Editar impressora
                  </h3>
                  <p className="mt-1.5 text-base leading-6 text-muted">
                    Atualize status, materiais e dados principais do equipamento.
                  </p>
                </div>
                <button
                  type="button"
                  title="Fechar"
                  aria-label="Fechar edicao"
                  onClick={fecharEdicaoImpressora}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <form className="grid gap-4" onSubmit={salvarEdicaoImpressora}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Nome
                    <input
                      value={edicaoImpressora.name}
                      onChange={(event) =>
                        setEdicaoImpressora((impressora) => ({
                          ...impressora,
                          name: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Modelo
                    <input
                      value={edicaoImpressora.model}
                      onChange={(event) =>
                        setEdicaoImpressora((impressora) => ({
                          ...impressora,
                          model: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Marca
                    <input
                      value={edicaoImpressora.brand}
                      onChange={(event) =>
                        setEdicaoImpressora((impressora) => ({
                          ...impressora,
                          brand: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Dimensoes
                    <input
                      value={edicaoImpressora.dimensions}
                      onChange={(event) =>
                        setEdicaoImpressora((impressora) => ({
                          ...impressora,
                          dimensions: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      required
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Estado
                  <select
                    value={edicaoImpressora.status}
                    onChange={(event) =>
                      setEdicaoImpressora((impressora) => ({
                        ...impressora,
                        status: event.target.value as LocalPrinter["status"],
                      }))
                    }
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Em manutencao">Em manutencao</option>
                    <option value="Indisponivel">Indisponivel</option>
                    <option value="Desativada">Desativada</option>
                  </select>
                </label>

                <fieldset className="grid gap-3 rounded-lg border border-border bg-background p-4">
                  <legend className="px-1 text-base font-semibold text-text">
                    Filamentos permitidos
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {filamentosDisponiveis.map((filamento) => {
                      const selecionado =
                        edicaoImpressora.allowed_filaments.includes(filamento);

                      return (
                        <label
                          key={filamento}
                          className={[
                            "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
                            selecionado
                              ? "border-primary bg-primary-soft text-primary-dark"
                              : "border-border bg-surface text-muted hover:border-primary",
                          ].join(" ")}
                        >
                          <input
                            checked={selecionado}
                            className="h-4 w-4 accent-primary"
                            onChange={() => toggleFilamentoEdicao(filamento)}
                            type="checkbox"
                          />
                          {filamento}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    className="min-h-9 px-3 py-2 text-base"
                    onClick={fecharEdicaoImpressora}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-9 px-3 py-2 text-base"
                  >
                    Salvar alteracoes
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div>
      <PageHeader
        title="Impressoras"
        description="Lista inicial de equipamentos, status operacional e materiais compatÃ­veis demonstrativos."
        action={
          <Button
            fullWidth
            variant="success"
            onClick={() => setModalAberto(true)}
          >
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            Cadastrar impressora
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {impressoras.map((impressora) => (
          <Card key={impressora.id} className="flex min-h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {impressora.name}
                </h3>
                <p className="mt-2 text-lg text-muted">
                  {impressora.brand} - {impressora.model}
                </p>
              </div>
              <StatusBadge
                label={impressora.status}
                variant={impressora.status === "Ativa" ? "success" : "warning"}
              />
            </div>
            <dl className="mt-4 grid gap-2 text-base leading-6 text-muted">
              <div>
                <dt className="font-semibold text-text">Dimensoes</dt>
                <dd>{impressora.dimensions}</dd>
              </div>
              <div>
                <dt className="font-semibold text-text">
                  Filamentos permitidos
                </dt>
                <dd>
                  {impressora.allowed_filaments.length > 0
                    ? impressora.allowed_filaments.join(", ")
                    : "Nenhum filamento cadastrado"}
                </dd>
              </div>
            </dl>
            <div className="mt-auto flex justify-end pt-5">
              <button
                type="button"
                title="Editar impressora"
                aria-label={`Editar ${impressora.name}`}
                onClick={() => abrirEdicaoImpressora(impressora)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </Card>
        ))}
      </section>

      {popupCadastro}
      {popupEdicao}
    </div>
  );
}
