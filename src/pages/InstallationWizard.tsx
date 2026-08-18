import { FormEvent, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../lib/auth";
import { completeInstallation } from "../lib/supabaseRepository";

type MaterialDraft = { id: string; name: string; description: string };
type PrinterDraft = {
  id: string;
  name: string;
  model: string;
  location: string;
  notes: string;
  materialNames: string[];
};

const timezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Recife",
  "America/Fortaleza",
  "UTC",
];

function draftId() {
  return crypto.randomUUID();
}

export function InstallationWizard() {
  const navigate = useNavigate();
  const { labSettings, profile, refreshInstallation } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [materials, setMaterials] = useState<MaterialDraft[]>([]);
  const [printers, setPrinters] = useState<PrinterDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedMaterials = useMemo(
    () => materials.filter((material) => material.name.trim()),
    [materials],
  );

  if (labSettings?.setup_completed_at) return <Navigate to="/" replace />;
  if (profile?.role !== "coordinator") return <Navigate to="/" replace />;

  function validateCurrentStep() {
    setErrorMessage("");

    if (step === 0 && (!name.trim() || !acronym.trim())) {
      setErrorMessage("Informe o nome e a sigla do laboratório.");
      return false;
    }

    if (step === 1) {
      const names = normalizedMaterials.map((material) => material.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        setErrorMessage("Não repita o mesmo material.");
        return false;
      }
    }

    if (step === 2) {
      const validPrinters = printers.filter((printer) => printer.name.trim());
      const names = validPrinters.map((printer) => printer.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        setErrorMessage("Não repita a mesma impressora.");
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (validateCurrentStep()) setStep((current) => Math.min(current + 1, 3));
  }

  function addMaterial() {
    setMaterials((current) => [...current, { id: draftId(), name: "", description: "" }]);
  }

  function addPrinter() {
    setPrinters((current) => [
      ...current,
      { id: draftId(), name: "", model: "", location: "", notes: "", materialNames: [] },
    ]);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      await completeInstallation({
        name,
        acronym,
        timezone,
        catalog: {
          materials: normalizedMaterials.map((material) => ({
            name: material.name,
            description: material.description || null,
          })),
          printers: printers
            .filter((printer) => printer.name.trim())
            .map((printer) => ({
              name: printer.name,
              model: printer.model || null,
              location: printer.location || null,
              notes: printer.notes || null,
              materialNames: printer.materialNames,
            })),
        },
      });
      await refreshInstallation();
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir a instalação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Instalação inicial</p>
          <h1 className="mt-1 text-3xl font-bold">Configure seu laboratório</h1>
          <p className="mt-2 text-muted">Etapa {step + 1} de 4. Somente o primeiro coordenador pode concluir este processo.</p>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-2" aria-label="Progresso da instalação">
          {["Identidade", "Materiais", "Impressoras", "Revisão"].map((label, index) => (
            <div key={label} className="min-w-0">
              <div className={`h-2 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`} />
              <p className="mt-2 truncate text-xs font-semibold text-muted">{label}</p>
            </div>
          ))}
        </div>

        <form onSubmit={finish}>
          <Card className="grid gap-5">
            {step === 0 ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Identidade do laboratório</h2>
                  <p className="mt-1 text-muted">Essas informações aparecerão no cabeçalho do sistema.</p>
                </div>
                <label className="grid gap-2 font-semibold">
                  Nome completo
                  <input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 font-semibold">
                    Sigla
                    <input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal uppercase" value={acronym} onChange={(event) => setAcronym(event.target.value)} maxLength={20} required />
                  </label>
                  <label className="grid gap-2 font-semibold">
                    Fuso horário
                    <select className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                      {timezones.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Materiais iniciais</h2>
                  <p className="mt-1 text-muted">Etapa opcional. Você também poderá cadastrar materiais depois.</p>
                </div>
                {materials.map((material) => (
                  <div key={material.id} className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_2fr_auto]">
                    <input aria-label="Nome do material" className="min-h-11 rounded-lg border border-border bg-surface px-4" placeholder="Ex.: PLA" value={material.name} onChange={(event) => setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, name: event.target.value } : item))} />
                    <input aria-label="Descrição do material" className="min-h-11 rounded-lg border border-border bg-surface px-4" placeholder="Descrição opcional" value={material.description} onChange={(event) => setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, description: event.target.value } : item))} />
                    <Button aria-label={`Remover ${material.name || "material"}`} variant="ghost" onClick={() => setMaterials((current) => current.filter((item) => item.id !== material.id))}><Trash2 className="h-5 w-5" /></Button>
                  </div>
                ))}
                <Button variant="secondary" onClick={addMaterial}><Plus className="mr-2 h-5 w-5" />Adicionar material</Button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Impressoras iniciais</h2>
                  <p className="mt-1 text-muted">Etapa opcional. Relacione cada impressora aos materiais compatíveis.</p>
                </div>
                {printers.map((printer) => (
                  <div key={printer.id} className="grid gap-4 rounded-lg border border-border bg-background p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input aria-label="Nome da impressora" className="min-h-11 rounded-lg border border-border bg-surface px-4" placeholder="Nome" value={printer.name} onChange={(event) => setPrinters((current) => current.map((item) => item.id === printer.id ? { ...item, name: event.target.value } : item))} />
                      <input aria-label="Modelo da impressora" className="min-h-11 rounded-lg border border-border bg-surface px-4" placeholder="Modelo" value={printer.model} onChange={(event) => setPrinters((current) => current.map((item) => item.id === printer.id ? { ...item, model: event.target.value } : item))} />
                      <input aria-label="Local da impressora" className="min-h-11 rounded-lg border border-border bg-surface px-4" placeholder="Localização" value={printer.location} onChange={(event) => setPrinters((current) => current.map((item) => item.id === printer.id ? { ...item, location: event.target.value } : item))} />
                    </div>
                    {normalizedMaterials.length ? (
                      <fieldset>
                        <legend className="mb-2 font-semibold">Materiais compatíveis</legend>
                        <div className="flex flex-wrap gap-3">
                          {normalizedMaterials.map((material) => (
                            <label key={material.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                              <input type="checkbox" checked={printer.materialNames.includes(material.name.trim())} onChange={(event) => setPrinters((current) => current.map((item) => item.id !== printer.id ? item : { ...item, materialNames: event.target.checked ? [...item.materialNames, material.name.trim()] : item.materialNames.filter((name) => name !== material.name.trim()) }))} />
                              {material.name}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}
                    <Button variant="ghost" onClick={() => setPrinters((current) => current.filter((item) => item.id !== printer.id))}><Trash2 className="mr-2 h-5 w-5" />Remover impressora</Button>
                  </div>
                ))}
                <Button variant="secondary" onClick={addPrinter}><Plus className="mr-2 h-5 w-5" />Adicionar impressora</Button>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Revisão</h2>
                  <p className="mt-1 text-muted">A conclusão grava toda a configuração em uma única transação.</p>
                </div>
                <dl className="grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
                  <div><dt className="text-sm font-semibold text-muted">Laboratório</dt><dd className="mt-1 font-bold">{name} ({acronym.toUpperCase()})</dd></div>
                  <div><dt className="text-sm font-semibold text-muted">Fuso horário</dt><dd className="mt-1 font-bold">{timezone}</dd></div>
                  <div><dt className="text-sm font-semibold text-muted">Materiais</dt><dd className="mt-1 font-bold">{normalizedMaterials.length}</dd></div>
                  <div><dt className="text-sm font-semibold text-muted">Impressoras</dt><dd className="mt-1 font-bold">{printers.filter((printer) => printer.name.trim()).length}</dd></div>
                </dl>
              </>
            ) : null}

            {errorMessage ? <p className="rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{errorMessage}</p> : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button variant="secondary" disabled={step === 0 || submitting} onClick={() => { setErrorMessage(""); setStep((current) => Math.max(0, current - 1)); }}><ChevronLeft className="mr-2 h-5 w-5" />Voltar</Button>
              {step < 3 ? (
                <Button
                  key="continue"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    nextStep();
                  }}
                >
                  Continuar<ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button key="finish" type="submit" variant="success" disabled={submitting}>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {submitting ? "Concluindo..." : "Concluir instalação"}
                </Button>
              )}
            </div>
          </Card>
        </form>
      </section>
    </main>
  );
}
