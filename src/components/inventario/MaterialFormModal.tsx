import { FormEvent, useState } from "react";

import {
  getInventoryErrorMessage,
  materialCategoryOptions,
  type CatalogMaterial,
  type MaterialCategory,
  type MaterialUnit,
} from "../../lib/inventory";
import { createCatalogMaterial, updateCatalogMaterial } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { inputClassName } from "../ui/formStyles";

type MaterialFormModalProps = {
  material?: CatalogMaterial | null;
  onClose: () => void;
  onSaved: () => void;
};

export function MaterialFormModal({ material, onClose, onSaved }: MaterialFormModalProps) {
  const [name, setName] = useState(material?.name ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [category, setCategory] = useState<MaterialCategory>(material?.category ?? "filament");
  const [unit, setUnit] = useState<MaterialUnit>(material?.unit ?? "g");
  const [active, setActive] = useState(material?.is_active ?? true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function escolherCategoria(value: MaterialCategory) {
    setCategory(value);
    // Sugere a unidade usual da categoria (resina em ml); a pessoa ainda pode trocar.
    setUnit(materialCategoryOptions.find((option) => option.value === value)?.defaultUnit ?? "g");
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErro("Informe o nome do material.");
      return;
    }
    const input = { name: trimmed, description: description.trim() || null, category, unit };
    try {
      setSalvando(true);
      setErro("");
      if (material) await updateCatalogMaterial(material.id, { ...input, is_active: active });
      else await createCatalogMaterial(input);
      onSaved();
    } catch (error) {
      setErro(getInventoryErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={material ? "Editar material" : "Novo material"}
      description="O material diz o que é (PLA, PETG, resina). Os itens de estoque (rolos, frascos...) são cadastrados na aba Estoque."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={salvar}>
        <label className="grid gap-2 text-base font-semibold text-text">
          Nome
          <input className={inputClassName} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-base font-semibold text-text">
            Categoria
            <select className={inputClassName} value={category} onChange={(e) => escolherCategoria(e.target.value as MaterialCategory)}>
              {materialCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            Unidade
            <select className={inputClassName} value={unit} onChange={(e) => setUnit(e.target.value as MaterialUnit)}>
              <option value="g">gramas (g)</option>
              <option value="ml">mililitros (ml)</option>
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-base font-semibold text-text">
          Descrição
          <textarea className={`${inputClassName} min-h-20 py-3`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {material ? (
          <label className="flex items-center gap-2 text-base font-semibold text-text">
            <input checked={active} className="h-4 w-4 accent-primary" type="checkbox" onChange={(e) => setActive(e.target.checked)} />
            Material ativo (arquivar tira das novas reservas e compatibilidades)
          </label>
        ) : null}

        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar material"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
