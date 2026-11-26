import { useEffect, useMemo, useState } from "react";
import { Boxes, CalendarCheck, Clock, ListChecks, ShoppingCart, Timer, Users, Wrench } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { ChartCard, DonutChart, RankingChart, TimeBarChart, type ChartDatum } from "../components/analytics/Charts";
import { LabTodayOverview } from "../components/inicio/LabTodayOverview";
import { PageHeader } from "../components/ui/PageHeader";
import { averageLeadTime, formatLeadTime } from "../lib/taskLeadTime";
import { LabTimeSection, TaskTimeByProjectChart, useTimeReport } from "../components/analytics/TimeReportSection";
import { StatCard } from "../components/ui/StatCard";
import { formatDateTime, useT } from "../i18n";
import {
  bookingsByStatus,
  filterUsageInPeriod,
  getGranularity,
  getPeriodRange,
  periodOptions,
  sumHours,
  usageByEquipment,
  usageByPerson,
  usageByProject,
  usageByWeekday,
  usageOverTime,
  type Granularity,
  type PeriodKey,
} from "../lib/analytics";
import { useCurrentProfile } from "../lib/currentUser";
import { getBookingStatusLabel, getTimezonePadrao, type Equipment, type EquipmentBooking, type PublicProfile } from "../lib/domain";
import { isSpoolLow } from "../lib/inventory";
import type { MaintenanceEpisode } from "../lib/maintenance";
import { getTaskStatusLabel, isTaskOverdue, formatCurrencyBRL, type ProjectTask, type TaskStatus } from "../lib/projects";
import { summarizeByProject, summarizeMaintenanceSpending, type PurchaseRequest } from "../lib/purchases";
import {
  listBookings,
  listEquipment,
  listMaintenanceEpisodes,
  listMyTasks,
  listVisibleTasks,
  listProfiles,
  listPurchaseRequests,
  listSpools,
} from "../lib/supabaseRepository";
import { totalReportSeconds } from "../lib/taskTime";
import { formatDuration } from "../lib/taskTimer";
import type { MaterialSpool } from "../lib/inventory";

type Tab = "mine" | "lab";

function bucketLabel(key: string, granularity: Granularity) {
  if (granularity === "month") return formatDateTime(`${key}-01T12:00:00`, { month: "short", year: "2-digit" });
  return formatDateTime(`${key}T12:00:00`, { day: "2-digit", month: "2-digit" });
}

function toRanking(rows: Array<{ name: string; hours: number }>): ChartDatum[] {
  return rows.map((row) => ({ name: row.name, value: row.hours }));
}

function purchaseTotals(purchases: PurchaseRequest[]) {
  return summarizeByProject(purchases)
    .map((row) => ({ name: row.projectName, value: Math.round((row.estimated + row.paid) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

type SectionProps = {
  bookings: EquipmentBooking[];
  period: PeriodKey;
  now: Date;
};

function UsageSection({ bookings, now, period }: SectionProps & { showPeople?: boolean }) {
  const t = useT();
  const range = useMemo(() => getPeriodRange(period, now), [period, now]);
  const granularity = getGranularity(period);
  const usage = useMemo(() => filterUsageInPeriod(bookings, range), [bookings, range]);
  const series = useMemo(
    () => usageOverTime(usage, range, granularity).map((row) => ({ name: bucketLabel(row.key, granularity), value: row.hours, count: row.count })),
    [usage, range, granularity],
  );
  const byEquipment = usageByEquipment(usage, t("dashboard.equipmentRemoved"));
  const byProject = usageByProject(usage, "-");
  const hoursHeader = t("analytics.hours");
  const nameHeader = t("analytics.name");
  const countHeader = t("analytics.bookings");

  return (
    <>
      <ChartCard
        title={t("analytics.usageOverTime")}
        hint={t("analytics.usageOverTimeHint")}
        table={{ headers: [t("analytics.period"), hoursHeader, countHeader], rows: series.map((row) => [row.name, row.value, row.count]) }}
      >
        <TimeBarChart data={series} valueLabel={hoursHeader} />
      </ChartCard>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title={t("analytics.byEquipment")}
          table={{ headers: [nameHeader, hoursHeader, countHeader], rows: byEquipment.map((row) => [row.name, row.hours, row.count]) }}
        >
          <RankingChart data={toRanking(byEquipment)} valueLabel={hoursHeader} />
        </ChartCard>
        <ChartCard
          title={t("analytics.byProject")}
          table={{ headers: [nameHeader, hoursHeader, countHeader], rows: byProject.map((row) => [row.name, row.hours, row.count]) }}
        >
          <RankingChart data={toRanking(byProject)} valueLabel={hoursHeader} />
        </ChartCard>
      </div>
    </>
  );
}

export function Analytics() {
  const t = useT();
  const { currentProfile } = useCurrentProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCoordinator = currentProfile?.role === "coordinator";
  const tab: Tab = searchParams.get("aba") === "lab" && isCoordinator ? "lab" : "mine";
  const periodParam = searchParams.get("periodo");
  const period: PeriodKey = periodOptions.includes(periodParam as PeriodKey) ? (periodParam as PeriodKey) : "30d";
  const now = useMemo(() => new Date(), []);
  const profileId = currentProfile?.id;
  const [people, setPeople] = useState<PublicProfile[]>([]);
  // Só o coordenador escolhe de quem são os números; os demais veem sempre os próprios.
  const requestedPerson = isCoordinator ? searchParams.get("pessoa") : null;
  const knownPerson = people.length === 0 || people.some((person) => person.id === requestedPerson);
  const selectedId = requestedPerson && knownPerson ? requestedPerson : profileId;
  const range = useMemo(() => getPeriodRange(period, now), [period, now]);
  const timeRows = useTimeReport(range.from, range.to);

  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [labTasks, setLabTasks] = useState<ProjectTask[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [episodes, setEpisodes] = useState<MaintenanceEpisode[]>([]);
  const [spools, setSpools] = useState<MaterialSpool[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!profileId) return undefined;
    let ativo = true;
    Promise.all([
      listBookings(),
      listPurchaseRequests(),
      isCoordinator ? listVisibleTasks() : Promise.resolve([] as ProjectTask[]),
      isCoordinator ? listEquipment() : Promise.resolve([] as Equipment[]),
      isCoordinator ? listMaintenanceEpisodes() : Promise.resolve([] as MaintenanceEpisode[]),
      isCoordinator ? listSpools() : Promise.resolve([] as MaterialSpool[]),
    ])
      .then(([bookingsData, purchasesData, labTasksData, equipmentData, episodesData, spoolsData]) => {
        if (!ativo) return;
        setErro("");
        setBookings(bookingsData);
        setPurchases(purchasesData);
        // Tarefas arquivadas ficam fora dos números.
        setLabTasks(labTasksData.filter((task) => !task.archived_at));
        setEquipment(equipmentData);
        setEpisodes(episodesData);
        setSpools(spoolsData);
      })
      .catch((error) => {
        if (ativo) setErro(error instanceof Error ? error.message : t("analytics.loadError"));
      });
    return () => {
      ativo = false;
    };
  }, [profileId, isCoordinator]);

  useEffect(() => {
    if (!isCoordinator) return undefined;
    let ativo = true;
    listProfiles()
      .then((data) => ativo && setPeople(data))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [isCoordinator]);

  // Tarefas da pessoa escolhida; ao trocar, a lista anterior sai da tela enquanto a nova chega.
  useEffect(() => {
    if (!selectedId) return undefined;
    let ativo = true;
    setTasks([]);
    listMyTasks(selectedId)
      .then((data) => ativo && setTasks(data.filter((task) => !task.archived_at)))
      .catch((error) => {
        if (ativo) setErro(error instanceof Error ? error.message : t("analytics.loadError"));
      });
    return () => {
      ativo = false;
    };
  }, [selectedId]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  if (!currentProfile) return null;

  const hoursHeader = t("analytics.hours");
  const nameHeader = t("analytics.name");
  const countHeader = t("analytics.bookings");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: getTimezonePadrao() }).format(now);

  const isSelf = selectedId === currentProfile.id;
  const selectedName = people.find((person) => person.id === selectedId)?.full_name ?? currentProfile.full_name;
  const myTimeRows = (timeRows ?? []).filter((row) => row.profile_id === selectedId);
  const myBookings = bookings.filter((booking) => booking.profile_id === selectedId);
  const myUsage = filterUsageInPeriod(myBookings, range);
  const myPurchases = purchases.filter((purchase) => purchase.requested_by === selectedId);
  const myPurchaseTotals = purchaseTotals(myPurchases);
  const myLead = averageLeadTime(tasks, range);
  const labLead = averageLeadTime(labTasks, range);
  const openTasks = tasks.filter((task) => task.status !== "done");
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task, today));
  const taskStatuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
  const tasksByStatus = taskStatuses
    .map((status) => ({ name: getTaskStatusLabel(status), value: tasks.filter((task) => task.status === status).length }))
    .filter((row) => row.value > 0);

  const labUsage = filterUsageInPeriod(bookings, range);
  const labPeople = usageByPerson(labUsage, "-");
  const weekdays = usageByWeekday(labUsage).map((row) => ({ name: t(`weekday.${row.weekday}` as Parameters<typeof t>[0]), value: row.hours, count: row.count }));
  const statuses = bookingsByStatus(bookings, range).map((row) => ({ name: getBookingStatusLabel(row.status), value: row.count }));
  const labPurchaseTotals = purchaseTotals(purchases);
  const maintenance = summarizeMaintenanceSpending(purchases);
  const equipmentNames = new Map(equipment.map((item) => [item.id, item.name]));
  const stops = new Map<string, number>();
  for (const episode of episodes) {
    if (new Date(episode.started_at) < range.from || new Date(episode.started_at) >= range.to) continue;
    const name = equipmentNames.get(episode.equipment_id) ?? t("dashboard.equipmentRemoved");
    stops.set(name, (stops.get(name) ?? 0) + 1);
  }
  const stopRows = [...stops.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const lowSpools = spools.filter(isSpoolLow).length;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={t("analytics.title")}
        description={
          tab === "lab" ? t("analytics.subtitleLab") : isSelf ? t("analytics.subtitleMine") : t("analytics.subtitlePerson", { name: selectedName })
        }
      />

      {erro ? <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={t("analytics.title")} className="flex gap-2">
          {(["mine", ...(isCoordinator ? ["lab"] : [])] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setParam("aba", item === "lab" ? "lab" : null)}
              className={[
                "min-h-11 rounded-lg border px-4 text-base font-semibold transition",
                tab === item ? "border-primary bg-primary-soft text-primary-dark" : "border-border bg-surface text-text hover:border-primary",
              ].join(" ")}
            >
              {t(item === "lab" ? "analytics.tabLab" : isCoordinator ? "analytics.tabPerson" : "analytics.tabMine")}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t("analytics.period")} className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => setParam("periodo", option === "30d" ? null : option)}
              className={[
                "min-h-11 rounded-lg border px-3 text-base font-semibold transition",
                period === option ? "border-primary bg-primary-soft text-primary-dark" : "border-border bg-surface text-text hover:border-primary",
              ].join(" ")}
            >
              {t(`analytics.period.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "mine" ? (
        <>
          {isCoordinator && people.length > 0 ? (
            <label className="flex flex-wrap items-center gap-3 text-base font-semibold text-text">
              {t("analytics.person")}
              <select
                className="min-h-11 min-w-0 max-w-full rounded-lg border border-border bg-surface px-4 text-base font-normal outline-none transition focus:border-primary sm:min-w-72"
                value={selectedId}
                onChange={(event) => setParam("pessoa", event.target.value === currentProfile.id ? null : event.target.value)}
              >
                <option value={currentProfile.id}>{t("analytics.you", { name: currentProfile.full_name })}</option>
                {people
                  .filter((person) => person.id !== currentProfile.id)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t(isSelf ? "analytics.myHours" : "analytics.hoursBooked")} value={String(sumHours(myUsage))} description={t("analytics.inPeriod")} icon={Clock} />
            <StatCard title={t(isSelf ? "analytics.myBookings" : "analytics.bookings")} value={String(myUsage.length)} description={t("analytics.inPeriod")} icon={CalendarCheck} />
            <StatCard
              title={t(isSelf ? "analytics.myTasks" : "analytics.openTasks")}
              value={String(openTasks.length)}
              description={t("analytics.overdueCount", { count: overdueTasks.length })}
              icon={ListChecks}
            />
            <StatCard
              title={t(isSelf ? "analytics.myPurchases" : "analytics.purchaseRequests")}
              value={formatCurrencyBRL(myPurchaseTotals.reduce((total, row) => total + row.value, 0))}
              description={t("analytics.purchasesHint")}
              icon={ShoppingCart}
            />
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={t(isSelf ? "analytics.myTaskTime" : "analytics.taskTime")}
              value={timeRows === null ? "-" : formatDuration(totalReportSeconds(myTimeRows))}
              description={t("analytics.inPeriod")}
              icon={Timer}
            />
            <StatCard title={t("analytics.leadTime")} value={myLead === null ? "-" : formatLeadTime(myLead)} description={t("analytics.leadTimeHint")} icon={CalendarCheck} />
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            {timeRows === null ? null : <TaskTimeByProjectChart rows={myTimeRows} />}
            <ChartCard
              title={t("analytics.tasksByStatus")}
              table={{ headers: [nameHeader, t("analytics.count")], rows: tasksByStatus.map((row) => [row.name, row.value]) }}
            >
              <DonutChart data={tasksByStatus} />
            </ChartCard>
          </div>
          <UsageSection bookings={myBookings} now={now} period={period} />
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard
              title={t("analytics.purchasesByProject")}
              hint={t("analytics.purchasesHint")}
              table={{ headers: [nameHeader, "R$"], rows: myPurchaseTotals.map((row) => [row.name, formatCurrencyBRL(row.value)]) }}
            >
              <RankingChart data={myPurchaseTotals} valueLabel="R$" />
            </ChartCard>
          </div>
        </>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t("analytics.labHours")} value={String(sumHours(labUsage))} description={t("analytics.inPeriod")} icon={Clock} />
            <StatCard
              title={t("analytics.labPeople")}
              value={String(new Set(labUsage.map((booking) => booking.profile_id)).size)}
              description={t("analytics.labPeopleHint", { count: labUsage.length })}
              icon={Users}
            />
            <StatCard
              title={t("analytics.maintenanceSpending")}
              value={formatCurrencyBRL(maintenance.paid + maintenance.estimated)}
              description={t("analytics.maintenanceStops", { count: stopRows.reduce((total, row) => total + row.value, 0) })}
              icon={Wrench}
            />
            <StatCard title={t("analytics.lowStock")} value={String(lowSpools)} description={t("analytics.lowStockHint")} icon={Boxes} />
          </section>
          <UsageSection bookings={bookings} now={now} period={period} />
          {timeRows === null ? null : <LabTimeSection rows={timeRows} />}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t("analytics.leadTime")} value={labLead === null ? "-" : formatLeadTime(labLead)} description={t("analytics.leadTimeHint")} icon={CalendarCheck} />
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard
              title={t("analytics.byPerson")}
              table={{ headers: [nameHeader, hoursHeader, countHeader], rows: labPeople.map((row) => [row.name, row.hours, row.count]) }}
            >
              <RankingChart data={toRanking(labPeople)} valueLabel={hoursHeader} />
            </ChartCard>
            <ChartCard
              title={t("analytics.byWeekday")}
              table={{ headers: [nameHeader, hoursHeader, countHeader], rows: weekdays.map((row) => [row.name, row.value, row.count]) }}
            >
              <TimeBarChart data={weekdays} valueLabel={hoursHeader} />
            </ChartCard>
            <ChartCard
              title={t("analytics.byStatus")}
              table={{ headers: [nameHeader, t("analytics.count")], rows: statuses.map((row) => [row.name, row.value]) }}
            >
              <DonutChart data={statuses} />
            </ChartCard>
            <ChartCard
              title={t("analytics.purchasesByProject")}
              hint={t("analytics.purchasesHint")}
              table={{ headers: [nameHeader, "R$"], rows: labPurchaseTotals.map((row) => [row.name, formatCurrencyBRL(row.value)]) }}
            >
              <RankingChart data={labPurchaseTotals} valueLabel="R$" />
            </ChartCard>
            <ChartCard
              title={t("analytics.stopsByEquipment")}
              table={{ headers: [nameHeader, t("analytics.count")], rows: stopRows.map((row) => [row.name, row.value]) }}
            >
              <RankingChart data={stopRows} valueLabel={t("analytics.count")} />
            </ChartCard>
          </div>
          <h3 className="mt-2 text-2xl font-bold text-text">{t("analytics.labToday")}</h3>
          <LabTodayOverview />
        </>
      )}
    </div>
  );
}
