import { FormEvent, useMemo, useState } from "react";

import {
  getInventoryErrorMessage,
  materialCategoryOptions,
  parseAmount,
  spoolStatusOptions,
  type CatalogMaterial,
  type MaterialCategory,
  type MaterialSpool,
  type SpoolStatus,
} from "../../lib/inventory";
import type { Project } from "../../lib/projects";
import { createCatalogMaterial, createSpool, updateSpool } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

const inputClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary";

type SpoolFormModalProps = {
  spool?: MaterialSpool | null;
  materials: CatalogMaterial[];
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
  onMaterialCreated: (material: CatalogMaterial) => void;
};

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function SpoolFormModal({ materials, onClose, onMaterialCreated, onSaved, projects, spool }: SpoolFormModalProps) {
  const [materialId, setMaterialId] = useState(spool?.material_id ?? "");
  const [colorName, setColorName] = useState(spool?.color_name ?? "");
  const [colorHex, setColorHex] = useState(spool?.color_hex ?? "#ffffff");
  const [manufacturer, setManufacturer] = useState(spool?.manufacturer ?? "");
  const [initial, setInitial] = useState(spool ? String(spool.initial_amount) : "");
  const [current, setCurrent] = useState(spool ? String(spool.current_amount) : "");
  const [projectId, setProjectId] = useState(spool?.project_id ?? "");
  const [status, setStatus] = useState<SpoolStatus>(spool?.status ?? "sealed");
  const [location, setLocation] = useState(spool?.storage_location ?? "");
  const [lot, setLot] = useState(spool?.lot_number ?? "");
  const [diameter, setDiameter] = useState(spool?.diameter_mm ? String(spool.diameter_mm) : "");
  const [openedOn, setOpenedOn] = useState(spool?.opened_on ?? "");
  const [driedOn, setDriedOn] = useState(spool?.last_dried_on ?? "");
  const [notes, setNotes] = useState(spool?.notes ?? "");
  const [novoMaterial, setNovoMaterial] = useState<{ name: string; category: MaterialCategory } | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const material = materials.find((item) => item.id === materialId);
  const unit = material?.unit ?? "g";
  const projetosOrdenados = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [projects]);

  async function cadastrarMaterial() {
    const name = novoMaterial?.name.trim();
    if (!novoMaterial || !name) {
      setErro("Informe o nome do material.");
      return;
    }
    const defaultUnit = materialCategoryOptions.find((option) => option.value === novoMaterial.category)?.defaultUnit ?? "g";
    try {
      setSalvando(true);
      const created = await createCatalogMaterial({ name, description: null, category: novoMaterial.category, unit: defaultUnit });
      onMaterialCreated(created);
      setMaterialId(created.id);
      setNovoMaterial(null);
      setErro("");
    } catch (error) {
      setErro(getInventoryErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const initialAmount = parseAmount(initial);
    const currentAmount = spool ? parseAmount(current) : initialAmount;
    const diameterValue = diameter.trim() ? parseAmount(diameter) : null;

    if (!materialId) return setErro("Escolha o material.");
    if (!colorName.trim()) return setErro("Informe o nome da cor.");
    if (initialAmount === null || initialAmount <= 0) return setErro(`Informe o peso inicial em ${unit}.`);
    if (currentAmount === null) return setErro(`Informe o peso atual em ${unit}.`);
    if (currentAmount > initialAmount) return setErro("O peso atual não pode passar do peso inicial.");
    if (diameter.trim() && (diameterValue === null || diameterValue <= 0)) return setErro("Informe um diâmetro válido.");

    const input = {
      material_id: materialId,
      color_name: colorName.trim(),
      color_hex: colorHex,
      manufacturer: toNullable(manufacturer),
      diameter_mm: diameterValue,
      lot_number: toNullable(lot),
      initial_amount: initialAmount,
      current_amount: currentAmount,
      project_id: projectId || null,
      storage_location: toNullable(location),
      opened_on: openedOn || null,
      last_dried_on: driedOn || null,
      notes: toNullable(notes),
    };

    try {
      setSalvando(true);
      setErro("");
      if (spool) await updateSpool(spool.id, { ...input, status });
      else await createSpool(input);
      onSaved();
    } catch (error) {
      setErro(getInventoryErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={spool ? "Editar rolo" : "Cadastrar rolo"}
      description="Cada rolo é uma unidade física: tem cor, peso e dono (um projeto ou o estoque geral)."
      onClose={onClose}
      wide
    >
      <form className="grid gap-4" onSubmit={salvar}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-base font-semibold text-text">
            Material
            <select className={inputClassName} required value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="" disabled>
                Selecione
              </option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="w-fit text-sm font-semibold text-primary underline"
              onClick={() => setNovoMaterial((current) => (current ? null : { name: "", category: "filament" }))}
            >
              + Novo material
            </button>
          </label>

          <div className="grid gap-2 text-base font-semibold text-text">
            Cor
            <div className="grid grid-cols-[auto_1fr] items-center gap-3">
              <input
                aria-label="Escolher cor"
                className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
              />
              <input
                aria-label="Nome da cor"
                className={inputClassName}
                placeholder="Ex.: Branco"
                required
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
              />
            </div>
          </div>
        </div>

        {novoMaterial ? (
          <div className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-semibold text-text">
              Nome do material
              <input
                className={inputClassName}
                placeholder="Ex.: PLA"
                value={novoMaterial.name}
                onChange={(e) => setNovoMaterial({ ...novoMaterial, name: e.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-text">
              Categoria
              <select
                className={inputClassName}
                value={novoMaterial.category}
                onChange={(e) => setNovoMaterial({ ...novoMaterial, category: e.target.value as MaterialCategory })}
              >
                {materialCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button disabled={salvando} onClick={cadastrarMaterial}>
              Cadastrar material
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-base font-semibold text-text">
            Fabricante
            <input className={inputClassName} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            Peso inicial ({unit})
            <input className={inputClassName} inputMode="decimal" required value={initial} onChange={(e) => setInitial(e.target.value)} />
          </label>
          {spool ? (
            <label className="grid gap-2 text-base font-semibold text-text">
              Peso atual ({unit})
              <input className={inputClassName} inputMode="decimal" required value={current} onChange={(e) => setCurrent(e.target.value)} />
            </label>
          ) : (
            <div />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-base font-semibold text-text">
            De quem é
            <select className={inputClassName} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Estoque geral do laboratório</option>
              {projetosOrdenados.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          {spool ? (
            <label className="grid gap-2 text-base font-semibold text-text">
              Situação
              <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value as SpoolStatus)}>
                {spoolStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <details className="rounded-lg border border-border bg-background p-4">
          <summary className="cursor-pointer text-base font-semibold text-text">Mais detalhes (local, lote, datas)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-base font-semibold text-text">
              Local de armazenamento
              <input className={inputClassName} value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="grid gap-2 text-base font-semibold text-text">
              Lote
              <input className={inputClassName} value={lot} onChange={(e) => setLot(e.target.value)} />
            </label>
            <label className="grid gap-2 text-base font-semibold text-text">
              Diâmetro (mm)
              <input className={inputClassName} inputMode="decimal" placeholder="1,75" value={diameter} onChange={(e) => setDiameter(e.target.value)} />
            </label>
            <label className="grid gap-2 text-base font-semibold text-text">
              Aberto em
              <input className={inputClassName} type="date" value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} />
            </label>
            <label className="grid gap-2 text-base font-semibold text-text">
              Última secagem
              <input className={inputClassName} type="date" value={driedOn} onChange={(e) => setDriedOn(e.target.value)} />
            </label>
            <label className="grid gap-2 text-base font-semibold text-text sm:col-span-2">
              Observações
              <textarea className={`${inputClassName} min-h-20 py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        </details>

        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar rolo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
