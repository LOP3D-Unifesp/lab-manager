import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PackagePlus, Pencil, Plus, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  getPrinterStatusLabel,
  type Material,
  type Printer,
  type PrinterMaterial,
  type PrinterStatus,
} from "../lib/domain";
import {
  createMaterial,
  createPrinter,
  listMaterials,
  listPrinterMaterials,
  listPrinters,
  setPrinterMaterials,
  updatePrinter,
} from "../lib/supabaseRepository";

type PrinterForm = {
  name: string;
  model: string;
  location: string;
  notes: string;
  status: PrinterStatus;
  materialIds: string[];
};

const statusOptions: PrinterStatus[] = [
  "active",
  "maintenance",
  "unavailable",
  "disabled",
];

const emptyPrinterForm: PrinterForm = {
  name: "",
  model: "",
  location: "",
  notes: "",
  status: "active",
  materialIds: [],
};

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function materialIdsForPrinter(
  printerId: string,
  printerMaterials: PrinterMaterial[],
) {
  return printerMaterials
    .filter((item) => item.printer_id === printerId)
    .map((item) => item.material_id);
}

export function Impressoras() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [printerMaterials, setPrinterMaterialsState] = useState<
    PrinterMaterial[]
  >([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [printerEmEdicao, setPrinterEmEdicao] = useState<Printer | null>(null);
  const [form, setForm] = useState<PrinterForm>(emptyPrinterForm);
  const [materialForm, setMaterialForm] = useState({
    name: "",
    description: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    const [printersData, materialsData, printerMaterialsData] =
      await Promise.all([
        listPrinters(),
        listMaterials(),
        listPrinterMaterials(),
      ]);

    setPrinters(printersData);
    setMaterials(materialsData);
    setPrinterMaterialsState(printerMaterialsData);
  }

  useEffect(() => {
    let ativo = true;

    carregarDados().catch((error) => {
      if (ativo) {
        setErro(error instanceof Error ? error.message : "Erro ao carregar.");
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  const materiaisPorImpressora = useMemo(() => {
    return printers.reduce<Record<string, Material[]>>((mapa, printer) => {
      const ids = new Set(materialIdsForPrinter(printer.id, printerMaterials));
      mapa[printer.id] = materials.filter((material) => ids.has(material.id));
      return mapa;
    }, {});
  }, [materials, printerMaterials, printers]);

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

  function toggleMaterial(materialId: string) {
    setForm((current) => ({
      ...current,
      materialIds: current.materialIds.includes(materialId)
        ? current.materialIds.filter((id) => id !== materialId)
        : [...current.materialIds, materialId],
    }));
  }

  function abrirCadastro() {
    setErro("");
    setPrinterEmEdicao(null);
    setForm(emptyPrinterForm);
    setModalAberto(true);
  }

  function abrirEdicao(printer: Printer) {
    setErro("");
    setPrinterEmEdicao(printer);
    setForm({
      name: printer.name,
      model: printer.model ?? "",
      location: printer.location ?? "",
      notes: printer.notes ?? "",
      status: printer.status,
      materialIds: materialIdsForPrinter(printer.id, printerMaterials),
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setPrinterEmEdicao(null);
    setForm(emptyPrinterForm);
    setErro("");
  }

  async function salvarMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = materialForm.name.trim();

    if (!name) {
      setErro("Informe o nome do material.");
      return;
    }

    try {
      setSalvando(true);
      await createMaterial({
        name,
        description: toNullable(materialForm.description),
      });
      setMaterialForm({ name: "", description: "" });
      await carregarDados();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPrinter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      setErro("Informe o nome da impressora.");
      return;
    }

    try {
      setSalvando(true);
      const savedPrinter = printerEmEdicao
        ? await updatePrinter(printerEmEdicao.id, {
            name,
            model: toNullable(form.model),
            location: toNullable(form.location),
            notes: toNullable(form.notes),
            status: form.status,
          })
        : await createPrinter({
            name,
            model: toNullable(form.model),
            location: toNullable(form.location),
            notes: toNullable(form.notes),
            status: form.status,
          });

      await setPrinterMaterials(savedPrinter.id, form.materialIds);
      await carregarDados();
      fecharModal();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }

  const popup =
    modalAberto && typeof document !== "undefined"
      ? createPortal(
          <div className="p-4" style={estiloCamadaPopup}>
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[92vh] w-[min(94vw,820px)] overflow-y-auto rounded-lg border border-border bg-surface px-8 py-7 text-left shadow-2xl sm:px-10 sm:py-9"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[24px] font-bold leading-tight text-text">
                    {printerEmEdicao
                      ? "Editar impressora"
                      : "Cadastrar impressora"}
                  </h3>
                  <p className="mt-1.5 text-base leading-6 text-muted">
                    Dados reais gravados no Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  title="Fechar"
                  aria-label="Fechar"
                  onClick={fecharModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <form className="grid gap-4" onSubmit={salvarPrinter}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Nome
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
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
                      value={form.model}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          model: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Local
                    <input
                      value={form.location}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Estado
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as PrinterStatus,
                        }))
                      }
                      className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {getPrinterStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Observacoes
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="min-h-24 min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
                  />
                </label>

                <fieldset className="grid gap-3 rounded-lg border border-border bg-background p-4">
                  <legend className="px-1 text-base font-semibold text-text">
                    Materiais compativeis
                  </legend>
                  {materials.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {materials.map((material) => {
                        const selecionado = form.materialIds.includes(
                          material.id,
                        );

                        return (
                          <label
                            key={material.id}
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
                              onChange={() => toggleMaterial(material.id)}
                              type="checkbox"
                            />
                            {material.name}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-border bg-surface p-3 text-base text-muted">
                      Cadastre materiais antes de definir compatibilidade.
                    </p>
                  )}
                </fieldset>

                {erro ? (
                  <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                    {erro}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={fecharModal}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar impressora"}
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
        description="Equipamentos, materiais e compatibilidades reais do Supabase."
        action={
          <Button fullWidth variant="success" onClick={abrirCadastro}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            Cadastrar impressora
          </Button>
        }
      />

      <section className="mb-5 rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-primary-soft p-3 text-primary">
            <PackagePlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text">Materiais</h3>
            <p className="mt-1 text-base text-muted">
              Materiais ativos usados nas compatibilidades das impressoras.
            </p>
          </div>
        </div>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={salvarMaterial}
        >
          <input
            aria-label="Nome do material"
            placeholder="Nome do material"
            value={materialForm.name}
            onChange={(event) =>
              setMaterialForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base text-text outline-none transition focus:border-primary"
          />
          <input
            aria-label="Descricao do material"
            placeholder="Descricao opcional"
            value={materialForm.description}
            onChange={(event) =>
              setMaterialForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base text-text outline-none transition focus:border-primary"
          />
          <Button type="submit" disabled={salvando}>
            Adicionar material
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {materials.length > 0 ? (
            materials.map((material) => (
              <span
                key={material.id}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold text-muted"
              >
                {material.name}
              </span>
            ))
          ) : (
            <p className="text-base font-semibold text-muted">
              Nenhum material cadastrado ainda.
            </p>
          )}
        </div>
      </section>

      {printers.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((printer) => {
            const compatibilities = materiaisPorImpressora[printer.id] ?? [];

            return (
              <Card key={printer.id} className="flex min-h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-text">
                      {printer.name}
                    </h3>
                    <p className="mt-2 text-lg text-muted">
                      {printer.model ?? "Modelo nao informado"}
                    </p>
                  </div>
                  <StatusBadge
                    label={getPrinterStatusLabel(printer.status)}
                    variant={printer.status === "active" ? "success" : "warning"}
                  />
                </div>
                <dl className="mt-4 grid gap-2 text-base leading-6 text-muted">
                  <div>
                    <dt className="font-semibold text-text">Local</dt>
                    <dd>{printer.location ?? "Nao informado"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-text">
                      Materiais compativeis
                    </dt>
                    <dd>
                      {compatibilities.length > 0
                        ? compatibilities.map((material) => material.name).join(", ")
                        : "Nenhum material compativel"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex justify-end pt-5">
                  <button
                    type="button"
                    title="Editar impressora"
                    aria-label={`Editar ${printer.name}`}
                    onClick={() => abrirEdicao(printer)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </Card>
            );
          })}
        </section>
      ) : (
        <Card>
          <p className="text-lg font-semibold text-muted">
            Nenhuma impressora cadastrada ainda.
          </p>
        </Card>
      )}

      {erro && !modalAberto ? (
        <p className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      {popup}
    </div>
  );
}
