import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Wrench } from "lucide-react";

import { MaintenanceBlockModal } from "../components/equipamentos/MaintenanceBlockModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { getBlockState, getRelevantBlocks } from "../lib/maintenance";
import { useAuth } from "../lib/auth";
import {
  equipmentUsesMaterial,
  getTimezonePadrao,
  getEquipmentStatusLabel,
  type Equipment,
  type EquipmentMaterial,
  type EquipmentStatus,
  type EquipmentType,
  type MaintenanceBlock,
  type Material,
} from "../lib/domain";
import {
  createEquipment,
  createEquipmentType,
  listEquipment,
  listEquipmentMaterials,
  listEquipmentTypes,
  listMaintenanceBlocks,
  listMaterials,
  setEquipmentMaterials,
  updateEquipment,
} from "../lib/supabaseRepository";

type EquipmentForm = {
  name: string;
  type_id: string;
  model: string;
  asset_tag: string;
  location: string;
  notes: string;
  status: EquipmentStatus;
  materialIds: string[];
};

const statusOptions: EquipmentStatus[] = ["active", "maintenance", "unavailable", "disabled"];

const inputClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary";

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function materialIdsForEquipment(equipmentId: string, items: EquipmentMaterial[]) {
  return items.filter((item) => item.equipment_id === equipmentId).map((item) => item.material_id);
}

function getErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  if (text.includes("equipment_name_key")) return "Já existe um equipamento com esse nome.";
  if (text.includes("equipment_types_name_key")) return "Já existe um tipo com esse nome.";
  return text || "Não foi possível salvar.";
}

export function Equipamentos() {
  const { labSettings, profile } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const isCoordinator = profile?.role === "coordinator";
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [equipmentMaterials, setEquipmentMaterialsState] = useState<EquipmentMaterial[]>([]);
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [manutencaoDe, setManutencaoDe] = useState<Equipment | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Equipment | null>(null);
  const [form, setForm] = useState<EquipmentForm | null>(null);
  const [novoTipo, setNovoTipo] = useState<{ name: string; uses_material: boolean } | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    const [equipmentData, typesData, materialsData, equipmentMaterialsData, blocksData] = await Promise.all([
      listEquipment(),
      listEquipmentTypes(),
      listMaterials(),
      listEquipmentMaterials(),
      listMaintenanceBlocks(),
    ]);
    setEquipmentList(equipmentData);
    setTypes(typesData);
    setMaterials(materialsData);
    setEquipmentMaterialsState(equipmentMaterialsData);
    setBlocks(blocksData);
  }

  useEffect(() => {
    let ativo = true;
    carregarDados().catch((error) => {
      if (ativo) setErro(error instanceof Error ? error.message : "Erro ao carregar.");
    });
    return () => {
      ativo = false;
    };
  }, []);

  const materiaisPorEquipamento = useMemo(() => {
    return equipmentList.reduce<Record<string, Material[]>>((mapa, item) => {
      const ids = new Set(materialIdsForEquipment(item.id, equipmentMaterials));
      mapa[item.id] = materials.filter((material) => ids.has(material.id));
      return mapa;
    }, {});
  }, [materials, equipmentMaterials, equipmentList]);

  const contagemPorTipo = useMemo(
    () =>
      equipmentList.reduce<Record<string, number>>((mapa, item) => {
        mapa[item.type_id] = (mapa[item.type_id] ?? 0) + 1;
        return mapa;
      }, {}),
    [equipmentList],
  );

  const visiveis = equipmentList.filter((item) => filtroTipo === "all" || item.type_id === filtroTipo);
  const tipoDoForm = types.find((type) => type.id === form?.type_id);

  function formVazio(): EquipmentForm {
    const padrao = types.find((type) => type.uses_material) ?? types[0];
    return {
      name: "",
      type_id: padrao?.id ?? "",
      model: "",
      asset_tag: "",
      location: "",
      notes: "",
      status: "active",
      materialIds: [],
    };
  }

  function abrirCadastro() {
    if (!isCoordinator) return;
    setErro("");
    setEmEdicao(null);
    setForm(formVazio());
    setNovoTipo(null);
    setModalAberto(true);
  }

  function abrirEdicao(item: Equipment) {
    setErro("");
    setEmEdicao(item);
    setForm({
      name: item.name,
      type_id: item.type_id,
      model: item.model ?? "",
      asset_tag: item.asset_tag ?? "",
      location: item.location ?? "",
      notes: item.notes ?? "",
      status: item.status,
      materialIds: materialIdsForEquipment(item.id, equipmentMaterials),
    });
    setNovoTipo(null);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEmEdicao(null);
    setForm(null);
    setNovoTipo(null);
    setErro("");
  }

  function atualizarForm(patch: Partial<EquipmentForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  function alternarMaterial(materialId: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            materialIds: current.materialIds.includes(materialId)
              ? current.materialIds.filter((id) => id !== materialId)
              : [...current.materialIds, materialId],
          }
        : current,
    );
  }

  async function cadastrarTipo() {
    const name = novoTipo?.name.trim();
    if (!novoTipo || !name) {
      setErro("Informe o nome do tipo.");
      return;
    }
    try {
      setSalvando(true);
      const type = await createEquipmentType({ name, uses_material: novoTipo.uses_material });
      setTypes((current) => [...current, type].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      atualizarForm({ type_id: type.id });
      setNovoTipo(null);
      setErro("");
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEquipamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCoordinator || !form) {
      setErro("Apenas coordenadores podem adicionar ou editar equipamentos.");
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setErro("Informe o nome do equipamento.");
      return;
    }
    if (!form.type_id) {
      setErro("Escolha o tipo do equipamento.");
      return;
    }

    const input = {
      name,
      type_id: form.type_id,
      model: toNullable(form.model),
      asset_tag: toNullable(form.asset_tag),
      location: toNullable(form.location),
      notes: toNullable(form.notes),
      status: form.status,
    };

    try {
      setSalvando(true);
      const salvo = emEdicao ? await updateEquipment(emEdicao.id, input) : await createEquipment(input);
      // Compatibilidade de material só existe para tipos que usam material.
      await setEquipmentMaterials(salvo.id, tipoDoForm?.uses_material ? form.materialIds : []);
      await carregarDados();
      fecharModal();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipamentos"
        description="Impressoras, scanners e demais equipamentos do laboratório, com situação e compatibilidade de materiais."
        action={
          isCoordinator ? (
            <Button fullWidth variant="success" onClick={abrirCadastro}>
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              Cadastrar equipamento
            </Button>
          ) : undefined
        }
      />

      {equipmentList.length > 0 ? (
        <>
          <div role="tablist" aria-label="Tipo de equipamento" className="mb-4 flex flex-wrap gap-2">
            {[{ id: "all", name: "Todos", total: equipmentList.length }, ...types.filter((type) => contagemPorTipo[type.id]).map((type) => ({ id: type.id, name: type.name, total: contagemPorTipo[type.id] }))].map(
              (item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={filtroTipo === item.id}
                  className={[
                    "rounded-full border px-4 py-2 text-base font-semibold transition",
                    filtroTipo === item.id
                      ? "border-primary bg-primary-soft text-primary-dark"
                      : "border-border bg-surface text-muted hover:border-primary",
                  ].join(" ")}
                  onClick={() => setFiltroTipo(item.id)}
                >
                  {item.name} <span className="font-normal">({item.total})</span>
                </button>
              ),
            )}
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((item) => {
              const compatibilities = materiaisPorEquipamento[item.id] ?? [];
              return (
                <Card key={item.id} className="flex min-h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-text">{item.name}</h3>
                      <p className="mt-2 text-lg text-muted">
                        {[item.type?.name, item.model].filter(Boolean).join(" · ") || "Modelo não informado"}
                      </p>
                    </div>
                    <StatusBadge
                      label={getEquipmentStatusLabel(item.status)}
                      variant={item.status === "active" ? "success" : "warning"}
                    />
                  </div>
                  {(() => {
                    const agora = new Date();
                    const relevantes = getRelevantBlocks(
                      blocks.filter((block) => block.equipment_id === item.id),
                      agora,
                    );
                    const emCurso = relevantes.find((block) => getBlockState(block, agora) === "active");
                    const futuros = relevantes.filter((block) => getBlockState(block, agora) === "upcoming").length;
                    if (!emCurso && futuros === 0) return null;
                    return (
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-warning-dark">
                        <Wrench className="h-4 w-4" aria-hidden="true" />
                        {emCurso
                          ? `Em manutenção até ${new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(emCurso.ends_at))}`
                          : null}
                        {emCurso && futuros > 0 ? " · " : null}
                        {futuros > 0 ? `${futuros} bloqueio(s) agendado(s)` : null}
                      </p>
                    );
                  })()}
                  <dl className="mt-4 grid gap-2 text-base leading-6 text-muted">
                    <div>
                      <dt className="font-semibold text-text">Local</dt>
                      <dd>{item.location ?? "Não informado"}</dd>
                    </div>
                    {item.asset_tag ? (
                      <div>
                        <dt className="font-semibold text-text">Patrimônio</dt>
                        <dd>{item.asset_tag}</dd>
                      </div>
                    ) : null}
                    {equipmentUsesMaterial(item) ? (
                      <div>
                        <dt className="font-semibold text-text">Materiais compatíveis</dt>
                        <dd>
                          {compatibilities.length > 0
                            ? compatibilities.map((material) => material.name).join(", ")
                            : "Nenhum material compatível"}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-auto flex items-center justify-end gap-2 pt-5">
                    {isCoordinator ? (
                      <Button
                        className="min-h-9 px-3 py-2 text-sm"
                        variant="secondary"
                        onClick={() => setManutencaoDe(item)}
                      >
                        <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                        Bloquear manutenção
                      </Button>
                    ) : null}
                    <button
                      type="button"
                      title="Editar equipamento"
                      aria-label={`Editar ${item.name}`}
                      disabled={!isCoordinator}
                      onClick={() => abrirEdicao(item)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </section>
        </>
      ) : (
        <Card>
          <p className="text-lg font-semibold text-muted">Nenhum equipamento cadastrado ainda.</p>
        </Card>
      )}

      {erro && !modalAberto ? (
        <p className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      {manutencaoDe ? (
        <MaintenanceBlockModal
          equipment={manutencaoDe}
          blocks={blocks.filter((block) => block.equipment_id === manutencaoDe.id)}
          timezone={timezone}
          onClose={() => setManutencaoDe(null)}
          onChanged={async () => {
            try {
              setBlocks(await listMaintenanceBlocks());
            } catch (error) {
              setErro(getErrorMessage(error));
            }
          }}
        />
      ) : null}

      {modalAberto && form ? (
        <Modal
          title={emEdicao ? "Editar equipamento" : "Cadastrar equipamento"}
          description="Informe o tipo, o modelo e o local. Para impressoras, marque os materiais que ela aceita."
          onClose={fecharModal}
          wide
        >
          <form className="grid gap-4" onSubmit={salvarEquipamento}>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold text-text">
                Nome
                <input
                  className={inputClassName}
                  required
                  value={form.name}
                  onChange={(event) => atualizarForm({ name: event.target.value })}
                />
              </label>
              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2 text-base font-semibold text-text">
                  <label htmlFor="equipamento-tipo">Tipo</label>
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary underline"
                    onClick={() => setNovoTipo((current) => (current ? null : { name: "", uses_material: false }))}
                  >
                    + Novo tipo
                  </button>
                </div>
                <select
                  id="equipamento-tipo"
                  className={inputClassName}
                  required
                  value={form.type_id}
                  onChange={(event) => atualizarForm({ type_id: event.target.value })}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {novoTipo ? (
              <div className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <label className="grid gap-2 text-sm font-semibold text-text">
                  Nome do tipo
                  <input
                    className={inputClassName}
                    value={novoTipo.name}
                    onChange={(event) => setNovoTipo({ ...novoTipo, name: event.target.value })}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-text">
                  <input
                    checked={novoTipo.uses_material}
                    className="h-4 w-4 accent-primary"
                    type="checkbox"
                    onChange={(event) => setNovoTipo({ ...novoTipo, uses_material: event.target.checked })}
                  />
                  Usa material nas reservas
                </label>
                <Button disabled={salvando} onClick={cadastrarTipo}>
                  Cadastrar tipo
                </Button>
              </div>
            ) : null}

            <div className="grid items-start gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold text-text">
                Modelo
                <input className={inputClassName} value={form.model} onChange={(event) => atualizarForm({ model: event.target.value })} />
              </label>
              <label className="grid gap-2 text-base font-semibold text-text">
                Patrimônio ou identificação
                <input
                  className={inputClassName}
                  value={form.asset_tag}
                  onChange={(event) => atualizarForm({ asset_tag: event.target.value })}
                />
              </label>
            </div>

            <div className="grid items-start gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold text-text">
                Local
                <input className={inputClassName} value={form.location} onChange={(event) => atualizarForm({ location: event.target.value })} />
              </label>
              <label className="grid gap-2 text-base font-semibold text-text">
                Estado
                <select
                  className={inputClassName}
                  value={form.status}
                  onChange={(event) => atualizarForm({ status: event.target.value as EquipmentStatus })}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {getEquipmentStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-base font-semibold text-text">
              Observações
              <textarea
                className={`${inputClassName} min-h-24 py-3`}
                value={form.notes}
                onChange={(event) => atualizarForm({ notes: event.target.value })}
              />
            </label>

            {tipoDoForm?.uses_material ? (
              <fieldset className="grid gap-3 rounded-lg border border-border bg-background p-4">
                <legend className="px-1 text-base font-semibold text-text">Materiais compatíveis</legend>
                {materials.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {materials.map((material) => {
                      const selecionado = form.materialIds.includes(material.id);
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
                            onChange={() => alternarMaterial(material.id)}
                            type="checkbox"
                          />
                          {material.name}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-surface p-3 text-base text-muted">
                    Cadastre materiais no Inventário antes de definir a compatibilidade.
                  </p>
                )}
              </fieldset>
            ) : null}

            {erro ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
            ) : null}

            <div className="mt-2 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar equipamento"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
