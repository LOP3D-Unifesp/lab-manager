import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Pencil, Plus } from "lucide-react";

import { MaterialFormModal } from "../components/inventario/MaterialFormModal";
import { SpoolCard } from "../components/inventario/SpoolCard";
import { SpoolFormModal } from "../components/inventario/SpoolFormModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import {
  filterSpools,
  formatAmount,
  getInventoryErrorMessage,
  getMaterialCategoryLabel,
  isSpoolUsable,
  parseAmount,
  spoolStatusOptions,
  type CatalogMaterial,
  type MaterialSpool,
  type SpoolFilters,
} from "../lib/inventory";
import type { Project } from "../lib/projects";
import { listCatalogMaterials, listProjects, listSpools, updateSpool } from "../lib/supabaseRepository";

type Aba = "rolos" | "materiais";

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

const filtrosIniciais: SpoolFilters = { search: "", materialId: "all", projectId: "all", status: "available", lowOnly: false };

export function Inventario() {
  const { profile } = useAuth();
  const isCoordinator = profile?.role === "coordinator";
  const [aba, setAba] = useState<Aba>("rolos");
  const [spools, setSpools] = useState<MaterialSpool[] | null>(null);
  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtros, setFiltros] = useState<SpoolFilters>(filtrosIniciais);
  const [erro, setErro] = useState("");
  const [rolo, setRolo] = useState<{ spool: MaterialSpool | null } | null>(null);
  const [material, setMaterial] = useState<{ material: CatalogMaterial | null } | null>(null);
  const [ajuste, setAjuste] = useState<MaterialSpool | null>(null);
  const [novoPeso, setNovoPeso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [spoolsData, materialsData, projectsData] = await Promise.all([listSpools(), listCatalogMaterials(), listProjects()]);
    setSpools(spoolsData);
    setMaterials(materialsData);
    setProjects(projectsData);
  }, []);

  useEffect(() => {
    let ativo = true;
    carregar().catch((error) => ativo && setErro(getInventoryErrorMessage(error)));
    return () => {
      ativo = false;
    };
  }, [carregar]);

  const materiaisAtivos = useMemo(() => materials.filter((item) => item.is_active), [materials]);
  const visiveis = useMemo(() => filterSpools(spools ?? [], filtros), [spools, filtros]);
  const rolosPorMaterial = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of spools ?? []) if (isSpoolUsable(item)) mapa.set(item.material_id, (mapa.get(item.material_id) ?? 0) + 1);
    return mapa;
  }, [spools]);
  const filtrando = JSON.stringify(filtros) !== JSON.stringify(filtrosIniciais);

  async function recarregar() {
    try {
      await carregar();
    } catch (error) {
      setErro(getInventoryErrorMessage(error));
    }
  }

  async function marcarVazio(spool: MaterialSpool) {
    if (!window.confirm(`Marcar o rolo ${spool.material_name} ${spool.color_name} como vazio?`)) return;
    try {
      setErro("");
      await updateSpool(spool.id, { current_amount: 0 });
      await recarregar();
    } catch (error) {
      setErro(getInventoryErrorMessage(error));
    }
  }

  async function salvarPeso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ajuste) return;
    const valor = parseAmount(novoPeso);
    if (valor === null || valor > ajuste.initial_amount) {
      setErro(`Informe um peso entre 0 e ${formatAmount(ajuste.initial_amount, ajuste.unit)}.`);
      return;
    }
    try {
      setSalvando(true);
      setErro("");
      await updateSpool(ajuste.id, { current_amount: valor });
      setAjuste(null);
      await recarregar();
    } catch (error) {
      setErro(getInventoryErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Inventário"
        description="Rolos de filamento e outros insumos, com o peso que resta e de quem é cada um (um projeto ou o estoque geral)."
        action={
          isCoordinator ? (
            aba === "rolos" ? (
              <Button variant="success" onClick={() => setRolo({ spool: null })}>
                <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                Cadastrar rolo
              </Button>
            ) : (
              <Button variant="success" onClick={() => setMaterial({ material: null })}>
                <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                Novo material
              </Button>
            )
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Inventário" className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1">
        {(
          [
            { id: "rolos", label: "Rolos" },
            { id: "materiais", label: "Materiais" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={aba === item.id}
            className={[
              "rounded-md px-4 py-2 text-base font-semibold transition",
              aba === item.id ? "bg-primary-dark text-white" : "text-muted hover:text-text",
            ].join(" ")}
            onClick={() => setAba(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {erro ? (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {aba === "rolos" ? (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto]">
            <input
              className={selectClassName}
              placeholder="Buscar cor, fabricante ou lote"
              value={filtros.search}
              onChange={(e) => setFiltros((current) => ({ ...current, search: e.target.value }))}
            />
            <select
              aria-label="Material"
              className={selectClassName}
              value={filtros.materialId}
              onChange={(e) => setFiltros((current) => ({ ...current, materialId: e.target.value }))}
            >
              <option value="all">Todos os materiais</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Projeto"
              className={selectClassName}
              value={filtros.projectId}
              onChange={(e) => setFiltros((current) => ({ ...current, projectId: e.target.value }))}
            >
              <option value="all">Todos os donos</option>
              <option value="general">Estoque geral</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Situação"
              className={selectClassName}
              value={filtros.status}
              onChange={(e) => setFiltros((current) => ({ ...current, status: e.target.value as SpoolFilters["status"] }))}
            >
              <option value="available">Disponíveis</option>
              <option value="all">Todas as situações</option>
              {spoolStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label
              className={[
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-base font-semibold transition",
                filtros.lowOnly ? "border-danger bg-danger-soft text-danger-dark" : "border-border bg-surface text-text",
              ].join(" ")}
            >
              <input
                checked={filtros.lowOnly}
                className="h-4 w-4 accent-primary"
                type="checkbox"
                onChange={(e) => setFiltros((current) => ({ ...current, lowOnly: e.target.checked }))}
              />
              Pouco restante
            </label>
          </div>

          {filtrando && spools ? (
            <div className="mb-3 flex items-center justify-between gap-3 text-base text-muted">
              <span>
                {visiveis.length} de {spools.length} rolo(s)
              </span>
              <button type="button" className="font-semibold text-primary underline" onClick={() => setFiltros(filtrosIniciais)}>
                Limpar filtros
              </button>
            </div>
          ) : null}

          {spools === null && !erro ? <p className="text-lg text-muted">Carregando inventário...</p> : null}

          {spools !== null && visiveis.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Boxes className="h-8 w-8 text-muted" aria-hidden="true" />
                <p className="text-lg font-semibold">{spools.length === 0 ? "Nenhum rolo cadastrado ainda." : "Nenhum rolo com esses filtros."}</p>
                {spools.length === 0 && isCoordinator ? <p className="text-muted">Comece com “Cadastrar rolo”.</p> : null}
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((spool) => (
              <SpoolCard
                key={spool.id}
                spool={spool}
                onEdit={isCoordinator ? (item) => setRolo({ spool: item }) : undefined}
                onAdjust={
                  isCoordinator
                    ? (item) => {
                        setNovoPeso(String(item.current_amount));
                        setAjuste(item);
                      }
                    : undefined
                }
                onMarkEmpty={isCoordinator ? marcarVazio : undefined}
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          {materials.length === 0 ? (
            <p className="text-lg text-muted">Nenhum material cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {materials.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-text">{item.name}</p>
                    <p className="text-base text-muted">
                      {getMaterialCategoryLabel(item.category)} · {item.unit === "ml" ? "mililitros" : "gramas"}
                      {item.description ? ` · ${item.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">{rolosPorMaterial.get(item.id) ?? 0} rolo(s) disponível(is)</span>
                    <StatusBadge label={item.is_active ? "Ativo" : "Arquivado"} variant={item.is_active ? "success" : "neutral"} />
                    {isCoordinator ? (
                      <button
                        type="button"
                        title="Editar material"
                        aria-label={`Editar ${item.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
                        onClick={() => setMaterial({ material: item })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {rolo ? (
        <SpoolFormModal
          spool={rolo.spool}
          materials={materiaisAtivos}
          projects={projects}
          onClose={() => setRolo(null)}
          onMaterialCreated={(created) => setMaterials((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")))}
          onSaved={async () => {
            setRolo(null);
            await recarregar();
          }}
        />
      ) : null}

      {material ? (
        <MaterialFormModal
          material={material.material}
          onClose={() => setMaterial(null)}
          onSaved={async () => {
            setMaterial(null);
            await recarregar();
          }}
        />
      ) : null}

      {ajuste ? (
        <Modal
          title="Ajustar peso"
          description={`${ajuste.material_name} · ${ajuste.color_name}. Pese o rolo e informe quanto resta.`}
          onClose={() => setAjuste(null)}
        >
          <form className="grid gap-4" onSubmit={salvarPeso}>
            <label className="grid gap-2 text-base font-semibold text-text">
              Peso atual ({ajuste.unit})
              <input
                autoFocus
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                inputMode="decimal"
                value={novoPeso}
                onChange={(e) => setNovoPeso(e.target.value)}
              />
              <span className="text-sm font-normal text-muted">Peso inicial: {formatAmount(ajuste.initial_amount, ajuste.unit)}</span>
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setAjuste(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar peso"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
