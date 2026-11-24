import { useEffect, useMemo, useState } from "react";
import { Clock, ClipboardList, Printer, Users } from "lucide-react";

import { MyMaintenanceRequests } from "../components/equipamentos/MyMaintenanceRequests";
import { MyTasksBoard } from "../components/projetos/MyTasksBoard";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateTime, useT } from "../i18n";
import { useCurrentProfile } from "../lib/currentUser";
import {
  criarDataLocalSegura,
  getEquipmentStatusLabel,
  reservaBloqueiaHorario,
  type AvailabilitySlot,
  type Equipment,
  type EquipmentBooking,
  type PublicProfile,
} from "../lib/domain";
import { useLabSchedule } from "../lib/labSchedule";
import {
  listAvailability,
  listBookings,
  listEquipment,
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

  return formatDateTime(valor, { hour: "2-digit", minute: "2-digit" });
}

function intervalosSeCruzam(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && inicioB < fimA;
}

function reservaEhDaData(reserva: EquipmentBooking, data: string) {
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

function reservaEstaEmAndamento(reserva: EquipmentBooking, agora: Date) {
  return new Date(reserva.starts_at) <= agora && agora < new Date(reserva.ends_at);
}

export function Dashboard() {
  const t = useT();
  const { periodos } = useLabSchedule();
  const { currentProfile } = useCurrentProfile();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [erro, setErro] = useState("");
  const dataHoje = getDataLocalPadrao();
  const agora = useMemo(() => new Date(), []);
  const weekdayHoje = agora.getDay();

  useEffect(() => {
    let ativo = true;

    Promise.all([
      listProfiles(),
      listAvailability(),
      listEquipment(),
      listBookings(),
    ])
      .then(([profilesData, availabilityData, equipmentData, bookingsData]) => {
        if (ativo) {
          setErro("");
          setProfiles(profilesData);
          setAvailability(availabilityData);
          setEquipmentList(equipmentData);
          setBookings(bookingsData);
        }
      })
      .catch((error) => {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : t("dashboard.loadError"),
          );
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const pesquisadoresHoje = new Set(
    availability
      .filter((slot) => slot.weekday === weekdayHoje && slot.work_mode === "onsite")
      .map((slot) => slot.profile_id),
  );
  const pesquisadoresHomeOfficeHoje = new Set(
    availability
      .filter((slot) => slot.weekday === weekdayHoje && slot.work_mode === "remote")
      .map((slot) => slot.profile_id),
  );
  const pesquisadoresPresenciaisHoje = profiles.filter((profile) =>
    pesquisadoresHoje.has(profile.id),
  );
  const impressorasAtivas = equipmentList.filter(
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

  function getReservasDaImpressora(impressora: Equipment) {
    return reservasHoje.filter((reserva) => reserva.equipment_id === impressora.id);
  }

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description="" />

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("dashboard.researchersToday")}
          value={String(pesquisadoresPresenciaisHoje.length)}
          description={t("dashboard.remoteToday", { count: pesquisadoresHomeOfficeHoje.size })}
          icon={Users}
        />
        <StatCard
          title={t("dashboard.activeEquipment")}
          value={`${impressorasAtivas.length}/${equipmentList.length}`}
          description={t("dashboard.activeEquipmentHint")}
          icon={Printer}
        />
        <StatCard
          title={t("dashboard.bookingsToday")}
          value={String(reservasHoje.length)}
          description={t("dashboard.printsRunning", { count: reservasEmAndamento.length })}
          icon={ClipboardList}
        />
        <StatCard
          title={t("dashboard.nextPrint")}
          value={proximasReservas[0] ? formatarHorario(proximasReservas[0].starts_at) : "--"}
          description={
            proximasReservas[0]
              ? t("dashboard.nextPrintAt", {
                  project: proximasReservas[0].project_name,
                  equipment: proximasReservas[0].equipment?.name ?? t("dashboard.equipmentRemoved"),
                })
              : t("dashboard.noFutureBookings")
          }
          icon={Clock}
        />
      </section>

      {currentProfile ? <MyTasksBoard isCoordinator={currentProfile.role === "coordinator"} profileId={currentProfile.id} /> : null}

      <MyMaintenanceRequests />

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-text">
                {t("dashboard.equipmentToday")}
              </h3>
            </div>
            <StatusBadge label={dataHoje} variant="neutral" />
          </div>

          <div className="mt-5 grid gap-3">
            {equipmentList.length > 0 ? (
              equipmentList.map((impressora) => {
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
                          {t("dashboard.bookingsCount", { count: reservasDaImpressora.length })}
                        </p>
                      </div>
                      <StatusBadge
                        label={
                          impressora.status !== "active"
                            ? getEquipmentStatusLabel(impressora.status)
                            : emAndamento
                              ? t("dashboard.printing")
                              : t("dashboard.available")
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
                            {t("dashboard.timeRange", {
                              from: formatarHorario(reserva.starts_at),
                              to: formatarHorario(reserva.ends_at),
                              project: reserva.project_name,
                              material: reserva.material?.name ?? t("dashboard.materialRemoved"),
                            })}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">
                {t("dashboard.noEquipment")}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-text">{t("dashboard.presenceToday")}</h3>
          {currentProfile ? (
            <div className="mt-3 rounded-lg border border-primary bg-primary-soft px-3 py-2">
              <p className="text-sm font-bold text-primary-dark">
                {meusSlotsHoje.length > 0
                  ? t("dashboard.youAreOnList", {
                      list: meusSlotsHoje
                        .map(
                          (slot) =>
                            `${periodos.find((periodo) => periodo.id === slot.periodo)?.label} ${
                              slot.work_mode === "remote" ? t("dashboard.remoteTag") : t("dashboard.onsiteTag")
                            }`,
                        )
                        .filter(Boolean)
                        .join(", "),
                    })
                  : t("dashboard.youAreNotOnList")}
              </p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {periodos.map((periodo) => {
              const slotsDoPeriodo = availability.filter(
                (slot) =>
                  slot.weekday === weekdayHoje && slot.periodo === periodo.id,
              );
              const total = slotsDoPeriodo.filter(
                (slot) => slot.work_mode === "onsite",
              ).length;
              const totalHomeOffice = slotsDoPeriodo.filter(
                (slot) => slot.work_mode === "remote",
              ).length;
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
                          {t("dashboard.you")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      {totalHomeOffice > 0
                        ? t("dashboard.remoteCount", { count: totalHomeOffice })
                        : t("dashboard.onsiteResearchers")}
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
