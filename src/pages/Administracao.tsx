import { FormEvent, useEffect, useState } from "react";
import { Building2, Clock3, Pencil, Plus, Power, Utensils, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { TimezoneSelect } from "../components/ui/TimezoneSelect";
import { useAuth } from "../lib/auth";
import { formatSchedulePeriod, type LabSchedulePeriod } from "../lib/domain";
import { listLabSchedulePeriods, saveLabSchedulePeriod, updateLabBreaks, updateLabSettings } from "../lib/supabaseRepository";

type MealBreakId = "lunch" | "dinner";

const weekdays = [
  { value: 1, label: "Segunda" }, { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" }, { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" }, { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function Administracao() {
  const { labSettings, refreshInstallation } = useAuth();
  const [periods, setPeriods] = useState<LabSchedulePeriod[]>([]);
  const [labName, setLabName] = useState("");
  const [labAcronym, setLabAcronym] = useState("");
  const [labTimezone, setLabTimezone] = useState("America/Sao_Paulo");
  const [privacyContactEmail, setPrivacyContactEmail] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [operatingWeekdays, setOperatingWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | "new" | null>(null);
  const [editingBreakId, setEditingBreakId] = useState<MealBreakId | null>(null);
  const [draftStart, setDraftStart] = useState("08:00");
  const [draftEnd, setDraftEnd] = useState("10:00");
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  async function reloadPeriods() { setPeriods(await listLabSchedulePeriods(true)); }

  useEffect(() => { reloadPeriods().catch(() => setScheduleError("Não foi possível carregar os turnos.")); }, []);
  useEffect(() => {
    if (!labSettings) return;
    setLabName(labSettings.name ?? ""); setLabAcronym(labSettings.acronym ?? "");
    setLabTimezone(labSettings.timezone); setPrivacyContactEmail(labSettings.privacy_contact_email ?? "");
    setCapacity(labSettings.workspace_capacity); setOperatingWeekdays(labSettings.operating_weekdays);
  }, [labSettings]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await updateLabSettings({ name: labName, acronym: labAcronym, timezone: labTimezone,
        privacyContactEmail, workspaceCapacity: capacity, operatingWeekdays });
      await refreshInstallation(); setMessage("Configurações do laboratório atualizadas.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  function scheduleErrorMessage(reason: unknown, fallback: string) {
    const value = reason instanceof Error ? reason.message : "";
    if (value.includes("schedule_period_overlap") || value.includes("unique_interval")) {
      return "Este horário se sobrepõe a outro turno. Ajuste o início ou o fim.";
    }
    if (value.includes("schedule_period_break_overlap")) {
      return "Este turno se sobrepõe ao intervalo de almoço ou jantar.";
    }
    if (value.includes("meal_break_overlap")) {
      return "Este intervalo se sobrepõe a um turno ativo. Ajuste primeiro o turno ou o intervalo.";
    }
    if (value.includes("invalid_meal_breaks")) {
      return "Confira os horários: o início deve ser anterior ao fim e almoço e jantar não podem se sobrepor.";
    }
    if (value.includes("active_schedule_period_required")) {
      return "Mantenha pelo menos um turno ativo na agenda.";
    }
    if (value.includes("invalid_schedule_period")) {
      return "Informe um horário de início anterior ao horário de fim.";
    }
    return fallback;
  }

  function beginEdit(period: LabSchedulePeriod) {
    setEditingBreakId(null);
    setEditingPeriodId(period.id);
    setDraftStart(period.starts_at.slice(0, 5));
    setDraftEnd(period.ends_at.slice(0, 5));
    setScheduleError(""); setScheduleMessage("");
  }

  function beginCreate() {
    setEditingBreakId(null);
    setEditingPeriodId("new"); setDraftStart("08:00"); setDraftEnd("10:00");
    setScheduleError(""); setScheduleMessage("");
  }

  function cancelPeriodEdit() {
    setEditingPeriodId(null); setEditingBreakId(null); setScheduleError("");
  }

  function beginBreakEdit(breakId: MealBreakId) {
    if (!labSettings) return;
    setEditingPeriodId(null); setEditingBreakId(breakId);
    setDraftStart((breakId === "lunch" ? labSettings.lunch_starts_at : labSettings.dinner_starts_at).slice(0, 5));
    setDraftEnd((breakId === "lunch" ? labSettings.lunch_ends_at : labSettings.dinner_ends_at).slice(0, 5));
    setScheduleError(""); setScheduleMessage("");
  }

  async function persistPeriod() {
    const existing = periods.find((period) => period.id === editingPeriodId);
    setScheduleError(""); setScheduleMessage(""); setSavingPeriod(true);
    try {
      await saveLabSchedulePeriod({ id: existing?.id, startsAt: draftStart,
        endsAt: draftEnd, isActive: existing?.is_active ?? true });
      await reloadPeriods(); setEditingPeriodId(null);
      setScheduleMessage(existing ? "Turno atualizado." : "Turno adicionado.");
    } catch (reason) {
      setScheduleError(scheduleErrorMessage(reason, existing
        ? "Não foi possível atualizar o turno." : "Não foi possível adicionar o turno."));
    } finally { setSavingPeriod(false); }
  }

  async function togglePeriod(period: LabSchedulePeriod) {
    setScheduleError(""); setScheduleMessage(""); setSavingPeriod(true);
    try {
      await saveLabSchedulePeriod({ id: period.id, startsAt: period.starts_at.slice(0, 5),
        endsAt: period.ends_at.slice(0, 5), isActive: !period.is_active });
      await reloadPeriods();
      setScheduleMessage(period.is_active ? "Turno desativado." : "Turno ativado.");
    } catch (reason) {
      setScheduleError(scheduleErrorMessage(reason, "Não foi possível alterar o estado do turno."));
    } finally { setSavingPeriod(false); }
  }

  async function persistBreak() {
    if (!labSettings || !editingBreakId) return;
    setScheduleError(""); setScheduleMessage(""); setSavingPeriod(true);
    try {
      await updateLabBreaks({
        lunchStartsAt: editingBreakId === "lunch" ? draftStart : labSettings.lunch_starts_at,
        lunchEndsAt: editingBreakId === "lunch" ? draftEnd : labSettings.lunch_ends_at,
        dinnerStartsAt: editingBreakId === "dinner" ? draftStart : labSettings.dinner_starts_at,
        dinnerEndsAt: editingBreakId === "dinner" ? draftEnd : labSettings.dinner_ends_at,
      });
      await refreshInstallation(); setEditingBreakId(null);
      setScheduleMessage(`Intervalo de ${editingBreakId === "lunch" ? "almoço" : "jantar"} atualizado.`);
    } catch (reason) {
      setScheduleError(scheduleErrorMessage(reason, "Não foi possível atualizar o intervalo."));
    } finally { setSavingPeriod(false); }
  }

  function renderPeriodEditor(period?: LabSchedulePeriod) {
    const title = period
      ? `Editar ${formatSchedulePeriod(period.starts_at, period.ends_at)}`
      : "Novo turno";
    return (
      <div className="rounded-lg border border-primary bg-primary-soft/30 p-4">
        <p className="mb-3 text-base font-bold text-text">{title}</p>
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="grid gap-1 text-sm font-semibold">Início<input className="min-h-11 rounded-lg border border-border bg-surface px-3" type="time" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} /></label>
          <label className="grid gap-1 text-sm font-semibold">Fim<input className="min-h-11 rounded-lg border border-border bg-surface px-3" type="time" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2 md:min-w-[232px]">
            <Button className="w-full px-3 text-base" disabled={savingPeriod} onClick={cancelPeriodEdit} variant="secondary"><X className="mr-2 h-4 w-4" />Cancelar</Button>
            <Button className="w-full px-3 text-base" disabled={savingPeriod} onClick={persistPeriod}>{savingPeriod ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderBreakEditor(breakId: MealBreakId) {
    const label = breakId === "lunch" ? "Almoço" : "Jantar";
    return (
      <div className="rounded-lg border border-warning bg-warning-soft/40 p-4">
        <p className="mb-3 text-base font-bold text-text">Editar intervalo de {label.toLowerCase()}</p>
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="grid gap-1 text-sm font-semibold">Início<input className="min-h-11 rounded-lg border border-border bg-surface px-3" type="time" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} /></label>
          <label className="grid gap-1 text-sm font-semibold">Fim<input className="min-h-11 rounded-lg border border-border bg-surface px-3" type="time" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2 md:min-w-[232px]">
            <Button className="w-full px-3 text-base" disabled={savingPeriod} onClick={cancelPeriodEdit} variant="secondary"><X className="mr-2 h-4 w-4" />Cancelar</Button>
            <Button className="w-full px-3 text-base" disabled={savingPeriod} onClick={persistBreak}>{savingPeriod ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </div>
    );
  }

  const timelineItems: Array<
    | { kind: "period"; startsAt: string; period: LabSchedulePeriod }
    | { kind: "break"; startsAt: string; endsAt: string; breakId: MealBreakId; label: string }
  > = periods.map((period) => ({ kind: "period", startsAt: period.starts_at, period }));
  if (labSettings) {
    timelineItems.push(
      { kind: "break", breakId: "lunch", label: "Almoço", startsAt: labSettings.lunch_starts_at, endsAt: labSettings.lunch_ends_at },
      { kind: "break", breakId: "dinner", label: "Jantar", startsAt: labSettings.dinner_starts_at, endsAt: labSettings.dinner_ends_at },
    );
  }
  timelineItems.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const hasOpenEditor = editingPeriodId !== null || editingBreakId !== null;

  return (
    <div>
      <PageHeader title="Administração" description="Configure a identidade e o funcionamento do laboratório." />
      {message ? <p className="mb-4 rounded-lg border border-success bg-success-soft p-3 font-semibold text-success-dark">{message}</p> : null}
      {error ? <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{error}</p> : null}

      <Card className="mb-5">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-primary-soft p-3 text-primary"><Building2 className="h-5 w-5" /></div><div><h2 className="text-2xl font-bold">Laboratório</h2><p className="mt-1 text-muted">Identidade, privacidade, fuso e capacidade presencial.</p></div></div>
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={saveSettings}>
          <label className="grid gap-2 font-semibold">Nome<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" required value={labName} onChange={(e) => setLabName(e.target.value)} /></label>
          <label className="grid gap-2 font-semibold">Sigla<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal uppercase" required value={labAcronym} onChange={(e) => setLabAcronym(e.target.value)} /></label>
          <label className="grid gap-2 font-semibold">Fuso horário<TimezoneSelect id="admin-timezone" value={labTimezone} onChange={setLabTimezone} /></label>
          <label className="grid gap-2 font-semibold">Contato de privacidade<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" required type="email" value={privacyContactEmail} onChange={(e) => setPrivacyContactEmail(e.target.value)} /></label>
          <label className="grid gap-2 font-semibold">Espaços de trabalho<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" min={1} required type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /><span className="text-sm font-normal text-muted">Máximo de pessoas presenciais por turno.</span></label>
          <fieldset className="md:col-span-2 xl:col-span-3"><legend className="mb-2 font-semibold">Dias de funcionamento</legend><div className="flex flex-wrap gap-2">{weekdays.map((day) => <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3" key={day.value}><input checked={operatingWeekdays.includes(day.value)} type="checkbox" onChange={(e) => setOperatingWeekdays((current) => e.target.checked ? [...current, day.value] : current.filter((value) => value !== day.value))} />{day.label}</label>)}</div></fieldset>
          <div className="md:col-span-2 xl:col-span-3"><Button disabled={saving || operatingWeekdays.length === 0} type="submit">{saving ? "Salvando..." : "Salvar configurações"}</Button></div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="rounded-lg bg-primary-soft p-3 text-primary"><Clock3 className="h-5 w-5" /></div><div><h2 className="text-2xl font-bold">Turnos de trabalho</h2><p className="mt-1 text-muted">Os mesmos turnos são usados em todos os dias de funcionamento.</p><p className="mt-1 text-sm font-semibold text-muted">Os turnos são organizados automaticamente pelo horário de início.</p></div></div>
          <Button className="w-full shrink-0 sm:w-auto" disabled={hasOpenEditor || savingPeriod} onClick={beginCreate}><Plus className="mr-2 h-4 w-4" />Adicionar turno</Button>
        </div>

        {scheduleMessage ? <p className="mb-4 rounded-lg border border-success bg-success-soft p-3 font-semibold text-success-dark">{scheduleMessage}</p> : null}
        {scheduleError ? <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{scheduleError}</p> : null}

        <div className="grid gap-3">
          {editingPeriodId === "new" ? renderPeriodEditor() : null}
          {timelineItems.map((item) => {
            if (item.kind === "break") {
              if (editingBreakId === item.breakId) return <div key={item.breakId}>{renderBreakEditor(item.breakId)}</div>;
              return (
                <article className="flex flex-col gap-4 rounded-lg border border-warning bg-warning-soft/30 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.breakId}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-warning-soft p-2.5 text-warning-dark"><Utensils className="h-5 w-5" /></div>
                    <div><p className="font-bold text-text">{item.label}</p><p className="text-xl font-bold text-text">{formatSchedulePeriod(item.startsAt, item.endsAt)}</p><div className="mt-1"><StatusBadge label="Intervalo" variant="warning" /></div></div>
                  </div>
                  <Button aria-label={`Editar intervalo ${item.label}`} className="w-full px-3 text-base sm:w-28" disabled={hasOpenEditor || savingPeriod} onClick={() => beginBreakEdit(item.breakId)} variant="secondary"><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                </article>
              );
            }
            const { period } = item;
            if (editingPeriodId === period.id) return <div key={period.id}>{renderPeriodEditor(period)}</div>;
            return (
              <article className={["flex flex-col gap-4 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between", period.is_active ? "" : "bg-slate-50"].join(" ")} key={period.id}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className={["rounded-lg p-2.5", period.is_active ? "bg-primary-soft text-primary" : "bg-border/60 text-muted"].join(" ")}><Clock3 className="h-5 w-5" /></div>
                  <div><p className={["text-xl font-bold", period.is_active ? "text-text" : "text-muted"].join(" ")}>{formatSchedulePeriod(period.starts_at, period.ends_at)}</p><div className="mt-1"><StatusBadge label={period.is_active ? "Ativo" : "Inativo"} variant={period.is_active ? "success" : "neutral"} /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <Button aria-label={`Editar turno ${formatSchedulePeriod(period.starts_at, period.ends_at)}`} className="w-full px-3 text-base sm:w-28" disabled={hasOpenEditor || savingPeriod} onClick={() => beginEdit(period)} variant="secondary"><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                  <Button aria-label={`${period.is_active ? "Desativar" : "Ativar"} turno ${formatSchedulePeriod(period.starts_at, period.ends_at)}`} className="w-full px-3 text-base sm:w-28" disabled={hasOpenEditor || savingPeriod} onClick={() => togglePeriod(period)} variant={period.is_active ? "ghost" : "primary"}><Power className="mr-2 h-4 w-4" />{period.is_active ? "Desativar" : "Ativar"}</Button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
