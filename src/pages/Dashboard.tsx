import { useEffect, useMemo, useState } from "react";
import { Clock, ClipboardList, Printer, Users } from "lucide-react";

import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import {
  criarDataLocalSegura,
  getPrinterStatusLabel,
  periodos,
  reservaBloqueiaHorario,
  type AvailabilitySlot,
  type Printer as PrinterType,
  type PrinterBooking,
  type Profile,
} from "../lib/domain";
import {
  listAvailability,
  listBookings,
  listPrinters,
  listProfiles,
} from "../lib/supabaseRepository";

function getDataLocalPadrao() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarHorario(valor?: string) {
  if (!valor) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function intervalosSeCruzam(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && inicioB < fimA;
}

function reservaEhDaData(reserva: PrinterBooking, data: string) {
  const inicioDia = criarDataLocalSegura(data, "00:00");

  if (!inicioDia || !reservaBloqueiaHorario(reserva)) {
    return false;
  }

  const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  return intervalosSeCruzam(
    inicioDia,
    fimDia,
    new Date(reserva.starts_at),
    new Date(reserva.ends_at),
  );
}

function reservaEstaEmAndamento(reserva: PrinterBooking, agora: Date) {
  return new Date(reserva.starts_at) <= agora && agora < new Date(reserva.ends_at);
}

export function Dashboard() {
  const { currentProfile } = useCurrentProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [bookings, setBookings] = useState<PrinterBooking[]>([]);
  const [erro, setErro] = useState("");
  const dataHoje = getDataLocalPadrao();
  const agora = useMemo(() => new Date(), []);
  const weekdayHoje = agora.getDay();

  useEffect(() => {
    let ativo = true;

    Promise.all([
      listProfiles(),
      listAvailability(),
      listPrinters(),
      listBookings(),
    ])
      .then(([profilesData, availabilityData, printersData, bookingsData]) => {
        if (ativo) {
          setErro("");
          setProfiles(profilesData);
          setAvailability(availabilityData);
          setPrinters(printersData);
          setBookings(bookingsData);
        }
      })
      .catch((error) => {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar o dashboard.",
          );
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const pesquisadoresHoje = new Set(
    availability
      .filter((slot) => slot.weekday === weekdayHoje)
      .map((slot) => slot.profile_id),
  );
  const pesquisadoresPresenciaisHoje = profiles.filter((profile) =>
    pesquisadoresHoje.has(profile.id),
  );
  const impressorasAtivas = printers.filter(
    (impressora) => impressora.status === "active",
  );
  const reservasHoje = bookings
    .filter((reserva) => reservaEhDaData(reserva, dataHoje))
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  const reservasEmAndamento = reservasHoje.filter((reserva) =>
    reservaEstaEmAndamento(reserva, agora),
  );
  const meusSlotsHoje = currentProfile
    ? availability.filter(
        (slot) =>
          slot.profile_id === currentProfile.id && slot.weekday === weekdayHoje,
      )
    : [];
  const proximasReservas = reservasHoje.filter((reserva) => {
    return new Date(reserva.starts_at) >= agora;
  });

  function getReservasDaImpressora(impressora: PrinterType) {
    return reservasHoje.filter((reserva) => reserva.printer_id === impressora.id);
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="" />

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pesquisadores hoje"
          value={String(pesquisadoresPresenciaisHoje.length)}
          description={`${pesquisadoresHoje.size} pesquisador(es) com horario cadastrado hoje.`}
          icon={Users}
        />
        <StatCard
          title="Impressoras ativas"
          value={`${impressorasAtivas.length}/${printers.length}`}
          description="Equipamentos disponiveis para novas reservas."
          icon={Printer}
        />
        <StatCard
          title="Reservas hoje"
          value={String(reservasHoje.length)}
          description={`${reservasEmAndamento.length} impressao(oes) em andamento agora.`}
          icon={ClipboardList}
        />
        <StatCard
          title="Proxima impressao"
          value={proximasReservas[0] ? formatarHorario(proximasReservas[0].starts_at) : "--"}
          description={
            proximasReservas[0]
              ? `${proximasReservas[0].project_name} em ${
                  proximasReservas[0].printer?.name ?? "impressora removida"
                }`
              : "Nenhuma reserva futura para hoje."
          }
          icon={Clock}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-text">
                Impressoras hoje
              </h3>
            </div>
            <StatusBadge label={dataHoje} variant="neutral" />
          </div>

          <div className="mt-5 grid gap-3">
            {printers.length > 0 ? (
              printers.map((impressora) => {
                const reservasDaImpressora = getReservasDaImpressora(impressora);
                const emAndamento = reservasDaImpressora.find((reserva) =>
                  reservaEstaEmAndamento(reserva, agora),
                );

                return (
                  <div
                    key={impressora.id}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-bold text-text">
                          {impressora.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-muted">
                          {reservasDaImpressora.length} reserva(s) hoje
                        </p>
                      </div>
                      <StatusBadge
                        label={
                          impressora.status !== "active"
                            ? getPrinterStatusLabel(impressora.status)
                            : emAndamento
                              ? "Imprimindo"
                              : "Disponivel"
                        }
                        variant={
                          impressora.status !== "active"
                            ? "warning"
                            : emAndamento
                              ? "info"
                              : "success"
                        }
                      />
                    </div>
                    {reservasDaImpressora.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {reservasDaImpressora.slice(0, 2).map((reserva) => (
                          <p
                            key={reserva.id}
                            className="text-sm font-semibold text-muted"
                          >
                            {formatarHorario(reserva.starts_at)} ate{" "}
                            {formatarHorario(reserva.ends_at)} -{" "}
                            {reserva.project_name} ({reserva.material?.name ?? "material removido"})
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">
                Nenhuma impressora cadastrada.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-text">Presenca hoje</h3>
          {currentProfile ? (
            <div className="mt-3 rounded-lg border border-primary bg-primary-soft px-3 py-2">
              <p className="text-sm font-bold text-primary-dark">
                {meusSlotsHoje.length > 0
                  ? `Voce esta nesta lista: ${meusSlotsHoje
                      .map(
                        (slot) =>
                          periodos.find((periodo) => periodo.id === slot.periodo)
                            ?.label,
                      )
                      .filter(Boolean)
                      .join(", ")}`
                  : "Voce nao esta na lista de hoje."}
              </p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {periodos.map((periodo) => {
              const slotsDoPeriodo = availability.filter(
                (slot) =>
                  slot.weekday === weekdayHoje && slot.periodo === periodo.id,
              );
              const total = slotsDoPeriodo.length;
              const meuSlot = currentProfile
                ? slotsDoPeriodo.some((slot) => slot.profile_id === currentProfile.id)
                : false;

              return (
                <div
                  key={periodo.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-text">
                        {periodo.label}
                      </p>
                      {meuSlot ? (
                        <span className="rounded-full border border-primary bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-dark">
                          Voce
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Pesquisadores agendados
                    </p>
                  </div>
                  <StatusBadge
                    label={String(total)}
                    variant={total > 0 ? "info" : "neutral"}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
