import { useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Users, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { nomesPesquisadores } from "../lib/pesquisadores";

type PeriodoId = "manha" | "tarde" | "noite";

type AgendaEntry = {
  id: number;
  pesquisador: string;
  weekday: number;
  periodo: PeriodoId;
};

type SlotSelection = {
  weekday: number;
  periodo: PeriodoId;
};

const limitePorHorario = 10;

const periodos: Array<{
  id: PeriodoId;
  label: string;
  horario: string;
}> = [
  { id: "manha", label: "Manha", horario: "08:00 - 12:00" },
  { id: "tarde", label: "Tarde", horario: "13:00 - 17:00" },
  { id: "noite", label: "Noite", horario: "18:00 - 21:00" },
];

const agendaInicial: AgendaEntry[] = [
  { id: 1, pesquisador: "Ana Lima", weekday: 1, periodo: "manha" },
  { id: 2, pesquisador: "Bruno Costa", weekday: 1, periodo: "manha" },
  { id: 3, pesquisador: "Carla Mendes", weekday: 1, periodo: "tarde" },
  { id: 4, pesquisador: "Diego Rocha", weekday: 1, periodo: "tarde" },
  { id: 5, pesquisador: "Fernanda Alves", weekday: 2, periodo: "manha" },
  { id: 6, pesquisador: "Gabriel Nunes", weekday: 2, periodo: "noite" },
  { id: 7, pesquisador: "Helena Martins", weekday: 3, periodo: "manha" },
  { id: 8, pesquisador: "Igor Santos", weekday: 3, periodo: "tarde" },
  { id: 9, pesquisador: "Julia Torres", weekday: 4, periodo: "tarde" },
  { id: 10, pesquisador: "Lucas Pereira", weekday: 4, periodo: "noite" },
  { id: 11, pesquisador: "Marina Souza", weekday: 5, periodo: "manha" },
  { id: 12, pesquisador: "Nicolas Ferreira", weekday: 5, periodo: "tarde" },
];

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

export function AgendaLaboratorio() {
  const semanaAtual = useMemo(() => getSemanaAtual(), []);
  const calendarioRef = useRef<HTMLElement | null>(null);
  const [agenda, setAgenda] = useState(agendaInicial);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pesquisadorSelecionado, setPesquisadorSelecionado] = useState(
    nomesPesquisadores[0],
  );
  const [slotsSelecionados, setSlotsSelecionados] = useState<SlotSelection[]>(
    [],
  );
  const [erro, setErro] = useState("");

  const totalPesquisadores = new Set(
    agenda.map((entry) => entry.pesquisador),
  ).size;
  const totalSlots = semanaAtual.length * periodos.length;
  const slotsCheios = semanaAtual.reduce((total, dia) => {
    const cheiosDoDia = periodos.filter(
      (periodo) => getPesquisadoresDoSlot(dia.weekday, periodo.id).length >= 10,
    ).length;

    return total + cheiosDoDia;
  }, 0);

  function getPesquisadoresDoSlot(weekday: number, periodo: PeriodoId) {
    return agenda
      .filter((entry) => entry.weekday === weekday && entry.periodo === periodo)
      .map((entry) => entry.pesquisador)
      .sort((a, b) => a.localeCompare(b));
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

  function abrirModal() {
    setErro("");
    setMostrarModal(true);
  }

  function fecharModal() {
    setMostrarModal(false);
    setErro("");
    setSlotsSelecionados([]);
    setPesquisadorSelecionado(nomesPesquisadores[0]);
  }

  function registrarHorario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (slotsSelecionados.length === 0) {
      setErro("Selecione pelo menos um horario da semana.");
      return;
    }

    const slotCheio = slotsSelecionados.find((slot) => {
      const totalAtual = getPesquisadoresDoSlot(slot.weekday, slot.periodo)
        .length;
      const jaRegistrado = agenda.some(
        (entry) =>
          entry.pesquisador === pesquisadorSelecionado &&
          entry.weekday === slot.weekday &&
          entry.periodo === slot.periodo,
      );

      return totalAtual >= limitePorHorario && !jaRegistrado;
    });

    if (slotCheio) {
      const dia = semanaAtual.find((item) => item.weekday === slotCheio.weekday);
      const periodo = periodos.find((item) => item.id === slotCheio.periodo);
      setErro(
        `${dia?.label} de ${periodo?.label.toLowerCase()} ja esta com o limite de ${limitePorHorario} pesquisadores.`,
      );
      return;
    }

    const novosHorarios = slotsSelecionados
      .filter(
        (slot) =>
          !agenda.some(
            (entry) =>
              entry.pesquisador === pesquisadorSelecionado &&
              entry.weekday === slot.weekday &&
              entry.periodo === slot.periodo,
          ),
      )
      .map((slot, index) => ({
        id: Date.now() + index,
        pesquisador: pesquisadorSelecionado,
        weekday: slot.weekday,
        periodo: slot.periodo,
      }));

    if (novosHorarios.length === 0) {
      setErro("Este pesquisador ja esta registrado nos horarios selecionados.");
      return;
    }

    setAgenda((agendaAtual) => [...agendaAtual, ...novosHorarios]);
    fecharModal();
  }

  return (
    <div>
      <PageHeader
        title="Agenda do Laboratorio"
        description="Semana atual organizada por dia e por horarios fixos do LO&P3D, com limite de 10 pesquisadores por periodo."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button
              fullWidth
              variant="secondary"
              onClick={() =>
                calendarioRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <CalendarDays aria-hidden="true" className="mr-2 h-5 w-5" />
              Ver semana
            </Button>
            <Button fullWidth onClick={abrirModal}>
              <Plus aria-hidden="true" className="mr-2 h-5 w-5" />
              Registrar horario
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-soft p-3 text-primary">
              <CalendarDays aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-muted">Semana atual</p>
              <p className="text-2xl font-bold text-text">
                {semanaAtual[0].numero} - {semanaAtual[4].numero}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success-soft p-3 text-success-dark">
              <Users aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-muted">
                Pesquisadores
              </p>
              <p className="text-2xl font-bold text-text">
                {totalPesquisadores} com horario
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning-soft p-3 text-warning-dark">
              <Users aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-muted">
                Horarios cheios
              </p>
              <p className="text-2xl font-bold text-text">
                {slotsCheios} de {totalSlots}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section ref={calendarioRef} className="mt-5 scroll-mt-24">
        <div className="grid gap-4 xl:grid-cols-5">
          {semanaAtual.map((dia) => (
            <Card key={dia.weekday} className="flex min-h-[520px] flex-col">
              <div className="mb-4 border-b border-border pb-3">
                <h3 className="text-2xl font-bold text-text">{dia.label}</h3>
                <p className="mt-1 text-lg text-muted">{dia.numero}</p>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {periodos.map((periodo) => {
                  const nomes = getPesquisadoresDoSlot(
                    dia.weekday,
                    periodo.id,
                  );
                  const estaCheio = nomes.length >= limitePorHorario;

                  return (
                    <article
                      key={periodo.id}
                      className="flex min-h-36 flex-col rounded-lg border border-border bg-background p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold text-text">
                            {periodo.label}
                          </p>
                          <p className="mt-1 text-base font-semibold text-muted">
                            {periodo.horario}
                          </p>
                        </div>
                        <StatusBadge
                          label={`${nomes.length}/${limitePorHorario}`}
                          variant={estaCheio ? "warning" : "success"}
                        />
                      </div>

                      {nomes.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {nomes.map((nome) => (
                            <li
                              key={nome}
                              className="rounded-lg border border-border bg-surface px-3 py-2 text-base font-semibold text-text"
                            >
                              {nome}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-lg border border-dashed border-border bg-surface p-3 text-base text-muted">
                          Nenhum pesquisador registrado.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </section>

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
                  vai ao laboratorio.
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
              <label className="mb-5 flex max-w-md flex-col gap-2 text-base font-semibold text-text">
                Pesquisador
                <select
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-lg"
                  value={pesquisadorSelecionado}
                  onChange={(event) => {
                    setErro("");
                    setPesquisadorSelecionado(event.target.value);
                  }}
                >
                  {nomesPesquisadores.map((pesquisador) => (
                    <option key={pesquisador}>{pesquisador}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 lg:grid-cols-5">
                {semanaAtual.map((dia) => (
                  <div
                    key={dia.weekday}
                    className="rounded-lg border border-border bg-background p-3"
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
                        const jaRegistrado = nomes.includes(
                          pesquisadorSelecionado,
                        );
                        const estaCheio =
                          nomes.length >= limitePorHorario && !jaRegistrado;
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
                              disabled={estaCheio}
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
                              <span className="mt-1 block text-base font-semibold text-primary">
                                {nomes.length}/{limitePorHorario} registrados
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
                <Button type="submit" variant="success">
                  Salvar horarios
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
