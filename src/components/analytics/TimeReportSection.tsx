import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

import { useT } from "../../i18n";
import { getTaskTimeReport } from "../../lib/supabaseRepository";
import { groupSmallest, sumTimeReport, totalReportSeconds, type TimeReportRow } from "../../lib/taskTime";
import { formatDuration } from "../../lib/taskTimer";
import { StatCard } from "../ui/StatCard";
import { ChartCard, DonutChart, RankingChart, type ChartDatum } from "./Charts";

// Acima disso a pizza fica ilegível: os menores projetos viram uma fatia só.
const MAX_SLICES = 6;

// Tempo trabalhado nas tarefas (cronômetro) no período. Nulo enquanto carrega; o banco só devolve o tempo de outras
// pessoas para o coordenador.
export function useTimeReport(from: Date, to: Date) {
  const [rows, setRows] = useState<TimeReportRow[] | null>(null);
  const fromKey = from.getTime();
  const toKey = to.getTime();

  useEffect(() => {
    let ativo = true;
    getTaskTimeReport(new Date(fromKey), new Date(toKey))
      .then((data) => ativo && setRows(data))
      .catch(() => ativo && setRows([]));
    return () => {
      ativo = false;
    };
  }, [fromKey, toKey]);

  return rows;
}

const toHours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

// Pizza do tempo de uma pessoa, por projeto. Os valores vão em segundos para tempos curtos não sumirem do gráfico.
export function TaskTimeByProjectChart({ rows }: { rows: TimeReportRow[] }) {
  const t = useT();
  const byProject = sumTimeReport(rows, "project").filter((row) => row.seconds > 0);
  const slices = groupSmallest(byProject, MAX_SLICES, t("analytics.otherProjects"));

  return (
    <ChartCard
      title={t("analytics.taskTimeByProject")}
      hint={t("analytics.taskTimeHint")}
      table={{ headers: [t("analytics.name"), t("analytics.time")], rows: byProject.map((row) => [row.name, formatDuration(row.seconds)]) }}
    >
      <DonutChart data={slices.map((row) => ({ name: row.name, value: row.seconds }))} format={formatDuration} empty={t("analytics.noTaskTime")} />
    </ChartCard>
  );
}

// Tempo de todo o laboratório, por pessoa e por projeto (coordenador).
export function LabTimeSection({ rows }: { rows: TimeReportRow[] }) {
  const t = useT();
  const byPerson = sumTimeReport(rows, "person");
  const byProject = sumTimeReport(rows, "project");
  const hoursHeader = t("analytics.hours");
  const nameHeader = t("analytics.name");
  const toData = (list: typeof byPerson): ChartDatum[] => list.map((row) => ({ name: row.name, value: toHours(row.seconds) }));
  const toTable = (list: typeof byPerson) => list.map((row) => [row.name, formatDuration(row.seconds)]);

  return (
    <div className="grid gap-5">
      <StatCard title={t("analytics.labTaskTime")} value={formatDuration(totalReportSeconds(rows))} description={t("analytics.inPeriod")} icon={Timer} />
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title={t("analytics.taskTimeByPerson")} table={{ headers: [nameHeader, t("analytics.time")], rows: toTable(byPerson) }}>
          <RankingChart data={toData(byPerson)} valueLabel={hoursHeader} />
        </ChartCard>
        <ChartCard title={t("analytics.taskTimeByProject")} table={{ headers: [nameHeader, t("analytics.time")], rows: toTable(byProject) }}>
          <RankingChart data={toData(byProject)} valueLabel={hoursHeader} />
        </ChartCard>
      </div>
    </div>
  );
}
