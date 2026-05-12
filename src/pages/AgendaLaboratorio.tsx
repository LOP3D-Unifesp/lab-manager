import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Trash2, Users, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import {
  periodos,
  type AvailabilitySlot,
  type PeriodoId,
  type WorkMode,
} from "../lib/domain";
import { usePesquisadoresCadastrados } from "../lib/pesquisadores";
import {
  addAvailabilitySlots,
  deleteAvailabilitySlot,
  listAvailability,
} from "../lib/supabaseRepository";

type AgendaEntry = {
  id: string;
  profileId: string;
  pesquisador: string;
  weekday: number;
  periodo: PeriodoId;
  workMode: WorkMode;
};

type SlotSelection = {
  weekday: number;
  periodo: PeriodoId;
};

type VistaAgenda = "hoje" | "semana";

type PopupSlot = {
  titulo: string;
  horario: string;
  entries: AgendaEntry[];
} | null;

const limitePorHorario = 10;

const diasDaSemana = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

function getSemanaAtual() {
  const hoje = new Date();
  const segunda = new Date(hoje);
  const distanciaDaSegunda = hoje.getDay() === 0 ? -6 : 1 - hoje.getDay();
  segunda.setDate(hoje.getDate() + distanciaDaSegunda);

  return Array.from({ length: 5 }, (_, index) => {
    const data = new Date(segunda);
    data.setDate(segunda.getDate() + index);

    return {
      data,
      weekday: data.getDay(),
      label: diasDaSemana[data.getDay()],
      numero: data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

function getSlotKey(slot: SlotSelection) {
  return `${slot.weekday}-${slot.periodo}`;
}

function isSameSlot(a: SlotSelection, b: SlotSelection) {
  return a.weekday === b.weekday && a.periodo === b.periodo;
}

function getCorDia(weekday: number) {
  return weekday % 2 === 1 ? "!bg-sky-50" : "!bg-white";
}

function getClasseContador(total: number) {
  if (total === 0) {
    return "border-border bg-background text-muted hover:bg-surface";
  }

  if (total <= 5) {
    return "border-success bg-success-soft text-success-dark hover:bg-surface";
  }

  if (total <= 8) {
    return "border-warning-dark bg-warning text-text hover:bg-warning-soft";
  }

  return "border-danger bg-danger-soft text-danger-dark hover:bg-surface";
}

function getDiaAbreviado(label: string) {
  return label.slice(0, 3);
}

export function AgendaLaboratorio() {
  const semanaAtual = useMemo(() => getSemanaAtual(), []);
  const calendarioRef = useRef<HTMLElement | null>(null);
  const { pesquisadores } = usePesquisadoresCadastrados();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pesquisadorSelecionado, setPesquisadorSelecionado] = useState("");
  const [slotsSelecionados, setSlotsSelecionados] = useState<SlotSelection[]>(
    [],
  );
  const [modoTrabalhoSelecionado, setModoTrabalhoSelecionado] =
    useState<WorkMode>("onsite");
  const [vistaAgenda, setVistaAgenda] = useState<VistaAgenda>("semana");
  const [mobileAgendaWeekday, setMobileAgendaWeekday] = useState(() => {
    const weekdayHoje = new Date().getDay();
    return (
      semanaAtual.find((dia) => dia.weekday === weekdayHoje)?.weekday ??
      semanaAtual[0].weekday
    );
  });
  const [popupSlot, setPopupSlot] = useState<PopupSlot>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const pesquisadoresOrdenados = useMemo(
    () =>
      [...pesquisadores].sort((a, b) =>
        `${a.nome} ${a.sobrenome}`.localeCompare(
          `${b.nome} ${b.sobrenome}`,
          "pt-BR",
        ),
      ),
    [pesquisadores],
  );

  const agenda = useMemo(() => {
    return availability.flatMap<AgendaEntry>((slot) => {
      const pesquisador = pesquisadores.find(
        (item) => item.id === slot.profile_id,
      );

      if (!pesquisador) {
        return [];
      }

      return {
        id: slot.id,
        profileId: pesquisador.id,
        pesquisador: `${pesquisador.nome} ${pesquisador.sobrenome}`,
        weekday: slot.weekday,
        periodo: slot.periodo,
        workMode: slot.work_mode,
      };
    });
  }, [availability, pesquisadores]);

  const nomesPesquisadores = useMemo(
    () =>
      pesquisadoresOrdenados.map(
        (pesquisador) => `${pesquisador.nome} ${pesquisador.sobrenome}`,
      ),
    [pesquisadoresOrdenados],
  );

  async function carregarDisponibilidade() {
    const slots = await listAvailability();
    setAvailability(slots);
  }

  useEffect(() => {
    let ativo = true;

    function recarregar() {
      if (document.visibilityState === "visible") {
        carregarDisponibilidade().catch((error) => {
          if (ativo) {
            setErro(error instanceof Error ? error.message : "Erro ao carregar.");
          }
        });
      }
    }

    recarregar();
    document.addEventListener("visibilitychange", recarregar);

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", recarregar);
    };
  }, []);

  useEffect(() => {
    const idsPesquisadores = pesquisadoresOrdenados.map(
      (pesquisador) => pesquisador.id,
    );

    if (
      idsPesquisadores.length > 0 &&
      !idsPesquisadores.includes(pesquisadorSelecionado)
    ) {
      setPesquisadorSelecionado(idsPesquisadores[0]);
    }
  }, [pesquisadoresOrdenados, pesquisadorSelecionado]);

  const pesquisadorAtual = pesquisadoresOrdenados.find(
    (pesquisador) => pesquisador.id === pesquisadorSelecionado,
  );
  const nomePesquisadorSelecionado = pesquisadorAtual
    ? `${pesquisadorAtual.nome} ${pesquisadorAtual.sobrenome}`
    : "";

  const hoje = new Date().getDay();
  const diaAtual = semanaAtual.find((dia) => dia.weekday === hoje);
  const diasVisiveis =
    vistaAgenda === "hoje" && diaAtual ? [diaAtual] : semanaAtual;
  const diasMobileVisiveis =
    vistaAgenda === "hoje" && diaAtual ? [diaAtual] : semanaAtual;
  const diaMobileAtivo =
    diasMobileVisiveis.find((dia) => dia.weekday === mobileAgendaWeekday) ??
    diasMobileVisiveis[0] ??
    semanaAtual[0];
  const totalPesquisadores = new Set(
    agenda
      .map((entry) => entry.pesquisador)
      .filter((nome) => nomesPesquisadores.includes(nome)),
  ).size;
  const totalSlots = semanaAtual.length * periodos.length;
  const slotsCheios = semanaAtual.reduce((total, dia) => {
    const cheiosDoDia = periodos.filter(
      (periodo) =>
        getTotalPresencialDoSlot(dia.weekday, periodo.id) >= limitePorHorario,
    ).length;

    return total + cheiosDoDia;
  }, 0);

  function getPesquisadoresDoSlot(weekday: number, periodo: PeriodoId) {
    return getEntriesDoSlot(weekday, periodo).map((entry) => entry.pesquisador);
  }

  function getEntriesDoSlot(weekday: number, periodo: PeriodoId) {
    return agenda
      .filter((entry) => entry.weekday === weekday && entry.periodo === periodo)
      .sort((a, b) => a.pesquisador.localeCompare(b.pesquisador));
  }

  function getTotalPresencialDoSlot(weekday: number, periodo: PeriodoId) {
    return getEntriesDoSlot(weekday, periodo).filter(
      (entry) => entry.workMode === "onsite",
    ).length;
  }

  function getTotalHomeOfficeDoSlot(weekday: number, periodo: PeriodoId) {
    return getEntriesDoSlot(weekday, periodo).filter(
      (entry) => entry.workMode === "remote",
    ).length;
  }

  function getTotalAulaDoSlot(weekday: number, periodo: PeriodoId) {
    return getEntriesDoSlot(weekday, periodo).filter(
      (entry) => entry.workMode === "aula",
    ).length;
  }

  function abrirDetalhesDoSlot(
    dia: (typeof semanaAtual)[number],
    periodo: (typeof periodos)[number],
  ) {
    setPopupSlot({
      titulo: `${dia.label} - ${periodo.label}`,
      horario: periodo.horario,
      entries: getEntriesDoSlot(dia.weekday, periodo.id),
    });
  }

  function renderIndicadoresDoSlot(
    totalHomeOffice: number,
    totalAula: number,
    compacto = false,
  ) {
    if (totalHomeOffice === 0 && totalAula === 0) {
      return null;
    }

    return (
      <div
        className={[
          "flex flex-wrap gap-1.5",
          compacto ? "mt-2" : "mt-auto gap-x-3 gap-y-1",
        ].join(" ")}
      >
        {totalHomeOffice > 0 ? (
          <span
            className={[
              "font-semibold text-primary",
              compacto
                ? "rounded-full border border-primary bg-primary-soft px-2 py-0.5 text-xs"
                : "text-sm",
            ].join(" ")}
          >
            {totalHomeOffice} home office
          </span>
        ) : null}
        {totalAula > 0 ? (
          <span
            className={[
              "font-semibold text-warning-dark",
              compacto
                ? "rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs"
                : "text-sm",
            ].join(" ")}
          >
            {totalAula} aula
          </span>
        ) : null}
      </div>
    );
  }

  function slotEstaSelecionado(slot: SlotSelection) {
    return slotsSelecionados.some((selecionado) =>
      isSameSlot(selecionado, slot),
    );
  }

  function toggleSlot(slot: SlotSelection) {
    setErro("");
    setSlotsSelecionados((selecionados) => {
      if (selecionados.some((selecionado) => isSameSlot(selecionado, slot))) {
        return selecionados.filter(
          (selecionado) => !isSameSlot(selecionado, slot),
        );
      }

      return [...selecionados, slot];
    });
  }

  function trocarVista(novaVista: VistaAgenda) {
    setVistaAgenda(novaVista);
    if (novaVista === "hoje") {
      setMobileAgendaWeekday(diaAtual?.weekday ?? semanaAtual[0].weekday);
    } else if (
      !semanaAtual.some((dia) => dia.weekday === mobileAgendaWeekday)
    ) {
      setMobileAgendaWeekday(semanaAtual[0].weekday);
    }
    calendarioRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function abrirModal() {
    setErro("");
    setMostrarModal(true);
  }

  async function excluirHorario(slotId: string) {
    try {
      setSalvando(true);
      await deleteAvailabilitySlot(slotId);
      await carregarDisponibilidade();
      setPopupSlot((slotAtual) => {
        if (!slotAtual) {
          return null;
        }

        return {
          ...slotAtual,
          entries: slotAtual.entries.filter((entry) => entry.id !== slotId),
        };
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel excluir.");
    } finally {
      setSalvando(false);
    }
  }

  function fecharModal() {
    setMostrarModal(false);
    setErro("");
    setSlotsSelecionados([]);
    setPesquisadorSelecionado(pesquisadoresOrdenados[0]?.id ?? "");
    setModoTrabalhoSelecionado("onsite");
  }

  async function registrarHorario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const profileIdSelecionado =
      String(formData.get("pesquisador_id") ?? "") ||
      pesquisadorSelecionado ||
      pesquisadoresOrdenados[0]?.id ||
      "";
    if (slotsSelecionados.length === 0) {
      setErro("Selecione pelo menos um horario da semana.");
      return;
    }

    if (!profileIdSelecionado) {
      setErro("Cadastre pelo menos um pesquisador antes de registrar horario.");
      return;
    }

    const slotCheio = slotsSelecionados.find((slot) => {
      const totalAtual = getTotalPresencialDoSlot(slot.weekday, slot.periodo);
      const jaRegistrado = agenda.some(
          (entry) =>
            entry.profileId === profileIdSelecionado &&
            entry.weekday === slot.weekday &&
            entry.periodo === slot.periodo,
      );

      return (
        totalAtual >= limitePorHorario &&
        !jaRegistrado &&
        modoTrabalhoSelecionado === "onsite"
      );
    });

    if (slotCheio) {
      const dia = semanaAtual.find((item) => item.weekday === slotCheio.weekday);
      const periodo = periodos.find((item) => item.id === slotCheio.periodo);
      setErro(
        `${dia?.label} de ${periodo?.label.toLowerCase()} ja esta com o limite de ${limitePorHorario} pesquisadores.`,
      );
      return;
    }

    const slotsNovos = slotsSelecionados.filter(
      (slot) =>
        !agenda.some(
          (entry) =>
            entry.profileId === profileIdSelecionado &&
            entry.weekday === slot.weekday &&
            entry.periodo === slot.periodo,
        ),
    );

    if (slotsNovos.length === 0) {
      setErro("Este pesquisador ja esta registrado nos horarios selecionados.");
      return;
    }

    try {
      setSalvando(true);
      await addAvailabilitySlots(
        profileIdSelecionado,
        slotsNovos.map((slot) => ({
          ...slot,
          workMode: modoTrabalhoSelecionado,
        })),
      );
      await carregarDisponibilidade();
      fecharModal();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const popupEntriesPresenciais =
    popupSlot?.entries.filter((entry) => entry.workMode === "onsite") ?? [];
  const popupEntriesHomeOffice =
    popupSlot?.entries.filter((entry) => entry.workMode === "remote") ?? [];
  const popupEntriesAula =
    popupSlot?.entries.filter((entry) => entry.workMode === "aula") ?? [];

  return (
    <div>
      <PageHeader
        title="Agenda do Laboratorio"
        description="Disponibilidade semanal gravada em availability_slots no Supabase."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button
              className="md:min-h-10 md:px-4 md:py-2 md:text-base"
              fullWidth
              variant={vistaAgenda === "hoje" ? "primary" : "secondary"}
              onClick={() => trocarVista("hoje")}
            >
              <CalendarDays aria-hidden="true" className="mr-2 h-5 w-5" />
              Ver hoje
            </Button>
            <Button
              className="md:min-h-10 md:px-4 md:py-2 md:text-base"
              fullWidth
              variant={vistaAgenda === "semana" ? "primary" : "secondary"}
              onClick={() => trocarVista("semana")}
            >
              <CalendarDays aria-hidden="true" className="mr-2 h-5 w-5" />
              Ver semana
            </Button>
            <Button
              className="md:min-h-10 md:px-4 md:py-2 md:text-base"
              fullWidth
              onClick={abrirModal}
            >
              <Plus aria-hidden="true" className="mr-2 h-5 w-5" />
              Registrar horario
            </Button>
          </div>
        }
      />

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="grid gap-3 text-sm font-semibold text-muted md:grid-cols-3">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />
            <span>Semana atual</span>
            <strong className="ml-auto text-base text-text">
              {semanaAtual[0].numero} - {semanaAtual[4].numero}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 text-success-dark" />
            <span>Pesquisadores</span>
            <strong className="ml-auto text-base text-text">
              {totalPesquisadores} de {nomesPesquisadores.length}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 text-warning-dark" />
            <span>Horarios cheios</span>
            <strong className="ml-auto text-base text-text">
              {slotsCheios} de {totalSlots}
            </strong>
          </div>
        </div>
      </section>

      <section ref={calendarioRef} className="mt-5 scroll-mt-24">
        <Card className="hidden overflow-hidden p-0 lg:block">
          <div
            className="grid border-b border-border bg-background"
            style={{
              gridTemplateColumns: `128px repeat(${diasVisiveis.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="border-r border-border px-4 py-3 text-sm font-bold uppercase text-muted">
              Horario
            </div>
            {diasVisiveis.map((dia) => {
              const ehHoje = dia.weekday === hoje;

              return (
                <div
                  key={dia.weekday}
                  className={[
                    "border-r border-border px-4 py-3 last:border-r-0",
                    ehHoje ? "bg-primary-soft" : "",
                  ].join(" ")}
                >
                  <p className="text-base font-bold text-text">{dia.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-muted">
                    {dia.numero}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `128px repeat(${diasVisiveis.length}, minmax(0, 1fr))`,
            }}
          >
            {periodos.map((periodo) => (
              <div key={periodo.id} className="contents">
                <div className="border-b border-r border-border bg-background px-4 py-4 last:border-b-0">
                  <p className="text-base font-bold text-text">
                    {periodo.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {periodo.horario}
                  </p>
                </div>
                {diasVisiveis.map((dia) => {
                  const total = getTotalPresencialDoSlot(
                    dia.weekday,
                    periodo.id,
                  );
                  const totalHomeOffice = getTotalHomeOfficeDoSlot(
                    dia.weekday,
                    periodo.id,
                  );
                  const totalAula = getTotalAulaDoSlot(
                    dia.weekday,
                    periodo.id,
                  );
                  const ehHoje = dia.weekday === hoje;

                  return (
                    <button
                      key={`${dia.weekday}-${periodo.id}`}
                      type="button"
                      className={[
                        "min-h-24 border-b border-r border-border p-3 text-left transition last:border-r-0 hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary",
                        ehHoje ? "bg-sky-50" : "bg-surface",
                      ].join(" ")}
                      onClick={() => abrirDetalhesDoSlot(dia, periodo)}
                    >
                      <span
                        className={[
                          "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-sm font-semibold leading-none",
                          getClasseContador(total),
                        ].join(" ")}
                      >
                        {total}/{limitePorHorario}
                      </span>
                      {renderIndicadoresDoSlot(
                        totalHomeOffice,
                        totalAula,
                        true,
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 p-3 sm:p-4 lg:hidden">
          <div className="mb-4 border-b border-border pb-3">
            <h3 className="text-xl font-bold text-text">Agenda da semana</h3>
            <p className="mt-1 text-base text-muted">
              {diaMobileAtivo.label}, {diaMobileAtivo.numero}
            </p>
          </div>

          <div
            aria-label="Selecionar dia da agenda do laboratorio"
            className={[
              "mb-3 grid gap-1",
              diasMobileVisiveis.length === 1 ? "grid-cols-1" : "grid-cols-5",
            ].join(" ")}
            role="tablist"
          >
            {diasMobileVisiveis.map((dia) => {
              const selected = dia.weekday === diaMobileAtivo.weekday;

              return (
                <button
                  aria-label={dia.label}
                  aria-selected={selected}
                  className={[
                    "min-w-0 rounded-lg border px-1 py-2 text-center text-xs font-bold leading-tight transition",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-text hover:border-primary hover:text-primary",
                  ].join(" ")}
                  key={dia.weekday}
                  onClick={() => setMobileAgendaWeekday(dia.weekday)}
                  role="tab"
                  title={dia.label}
                  type="button"
                >
                  {getDiaAbreviado(dia.label)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3">
            {periodos.map((periodo) => {
              const total = getTotalPresencialDoSlot(
                diaMobileAtivo.weekday,
                periodo.id,
              );
              const totalHomeOffice = getTotalHomeOfficeDoSlot(
                diaMobileAtivo.weekday,
                periodo.id,
              );
              const totalAula = getTotalAulaDoSlot(
                diaMobileAtivo.weekday,
                periodo.id,
              );

              return (
                <article
                  key={periodo.id}
                  className={[
                    "flex min-h-28 flex-col rounded-lg border p-3",
                    diaMobileAtivo.weekday === hoje
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-white/80",
                  ].join(" ")}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-text">
                        {periodo.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {periodo.horario}
                      </p>
                    </div>
                    <button
                      className={[
                        "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 py-1 text-base font-semibold leading-none transition",
                        getClasseContador(total),
                      ].join(" ")}
                      onClick={() => abrirDetalhesDoSlot(diaMobileAtivo, periodo)}
                      type="button"
                    >
                      {total}/{limitePorHorario}
                    </button>
                  </div>
                  {renderIndicadoresDoSlot(totalHomeOffice, totalAula)}
                </article>
              );
            })}
          </div>
        </Card>
      </section>

      {popupSlot ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 px-4 py-6"
          role="dialog"
        >
          <Card className="w-full max-w-md shadow-soft">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {popupSlot.titulo}
                </h3>
                <p className="mt-1 text-base font-semibold text-muted">
                  {popupSlot.horario}
                </p>
              </div>
              <button
                aria-label="Fechar lista"
                className="rounded-lg p-2 text-muted transition hover:bg-background hover:text-text"
                onClick={() => setPopupSlot(null)}
                type="button"
              >
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            {popupSlot.entries.length > 0 ? (
              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                    Presenciais
                  </p>
                  {popupEntriesPresenciais.length > 0 ? (
                    <ul className="grid gap-2">
                      {popupEntriesPresenciais.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-base font-semibold text-text"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">
                              {entry.pesquisador}
                            </span>
                          </span>
                          <button
                            type="button"
                            title="Excluir horario"
                            aria-label={`Excluir horario de ${entry.pesquisador}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark disabled:opacity-50"
                            disabled={salvando}
                            onClick={() => excluirHorario(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-base text-muted">
                      Nenhum pesquisador presencial.
                    </p>
                  )}
                </div>

                {popupEntriesHomeOffice.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                      Home office
                    </p>
                    <ul className="grid gap-2">
                      {popupEntriesHomeOffice.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-primary bg-primary-soft px-3 py-2 text-base font-semibold text-text"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">
                              {entry.pesquisador}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                              Home office
                            </span>
                            <button
                              type="button"
                              title="Excluir horario"
                              aria-label={`Excluir horario de ${entry.pesquisador}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark disabled:opacity-50"
                              disabled={salvando}
                              onClick={() => excluirHorario(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {popupEntriesAula.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                      Em aula
                    </p>
                    <ul className="grid gap-2">
                      {popupEntriesAula.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-base font-semibold text-text"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">
                              {entry.pesquisador}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full border border-warning bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning-dark">
                              Aula
                            </span>
                            <button
                              type="button"
                              title="Excluir horario"
                              aria-label={`Excluir horario de ${entry.pesquisador}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark disabled:opacity-50"
                              disabled={salvando}
                              onClick={() => excluirHorario(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-base text-muted">
                Nenhum pesquisador registrado.
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {mostrarModal ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/40 px-4 py-6 sm:items-center"
          role="dialog"
        >
          <Card className="max-h-[90vh] w-full max-w-5xl overflow-y-auto shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  Registrar horario da semana
                </h3>
                <p className="mt-1 text-lg text-muted">
                  Escolha o pesquisador e marque todos os horarios em que ele
                  trabalha.
                </p>
              </div>
              <button
                aria-label="Fechar"
                className="rounded-lg p-2 text-muted transition hover:bg-background hover:text-text"
                onClick={fecharModal}
                type="button"
              >
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={registrarHorario}>
              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-base font-semibold text-text">
                  Pesquisador
                  <select
                    name="pesquisador_id"
                    className="min-h-11 rounded-lg border border-border bg-background px-3 text-lg"
                    disabled={pesquisadoresOrdenados.length === 0}
                    value={pesquisadorSelecionado}
                    onChange={(event) => {
                      setErro("");
                      setPesquisadorSelecionado(event.target.value);
                    }}
                  >
                    {pesquisadoresOrdenados.map((pesquisador) => (
                      <option key={pesquisador.id} value={pesquisador.id}>
                        {pesquisador.nome} {pesquisador.sobrenome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-base font-semibold text-text">
                  Tipo de trabalho
                  <select
                    className="min-h-11 rounded-lg border border-border bg-background px-3 text-lg"
                    disabled={salvando}
                    onChange={(event) => {
                      setErro("");
                      setModoTrabalhoSelecionado(event.target.value as WorkMode);
                    }}
                    value={modoTrabalhoSelecionado}
                  >
                    <option value="onsite">Presencial</option>
                    <option value="remote">Home office</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 lg:grid-cols-5">
                {semanaAtual.map((dia) => (
                  <div
                    key={dia.weekday}
                    className={[
                      "rounded-lg border border-border p-3",
                      getCorDia(dia.weekday),
                    ].join(" ")}
                  >
                    <div className="mb-3">
                      <p className="text-xl font-bold text-text">
                        {dia.label}
                      </p>
                      <p className="text-base text-muted">{dia.numero}</p>
                    </div>

                    <div className="space-y-2">
                      {periodos.map((periodo) => {
                        const slot = {
                          weekday: dia.weekday,
                          periodo: periodo.id,
                        };
                        const nomes = getPesquisadoresDoSlot(
                          dia.weekday,
                          periodo.id,
                        );
                        const totalPresencial = getTotalPresencialDoSlot(
                          dia.weekday,
                          periodo.id,
                        );
                        const jaRegistrado = nomes.includes(
                          nomePesquisadorSelecionado,
                        );
                        const estaCheio =
                          totalPresencial >= limitePorHorario &&
                          !jaRegistrado &&
                          modoTrabalhoSelecionado === "onsite";
                        const selecionado = slotEstaSelecionado(slot);

                        return (
                          <label
                            key={getSlotKey(slot)}
                            className={[
                              "flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border bg-surface p-3 transition",
                              selecionado
                                ? "border-primary bg-primary-soft"
                                : "border-border",
                              estaCheio
                                ? "cursor-not-allowed opacity-60"
                                : "hover:border-primary",
                            ].join(" ")}
                          >
                            <input
                              checked={selecionado}
                              className="mt-1 h-5 w-5 accent-primary"
                              disabled={estaCheio && !selecionado}
                              onChange={() => toggleSlot(slot)}
                              type="checkbox"
                            />
                            <span>
                              <span className="block text-lg font-bold text-text">
                                {periodo.label}
                              </span>
                              <span className="block text-base text-muted">
                                {periodo.horario}
                              </span>
                              <span
                                className={[
                                  "mt-2 inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-sm font-semibold leading-none",
                                  getClasseContador(totalPresencial),
                                ].join(" ")}
                              >
                                {totalPresencial}/{limitePorHorario}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {erro ? (
                <p className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 text-lg font-semibold text-danger">
                  {erro}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={fecharModal}>
                  Cancelar
                </Button>
                <Button type="submit" variant="success" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar horarios"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
