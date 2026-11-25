import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

import { useT } from "../../i18n";
import { getTaskTimeReport } from "../../lib/supabaseRepository";
import { sumTimeReport, totalReportSeconds, type TimeReportRow } from "../../lib/taskTime";
import { formatDuration } from "../../lib/taskTimer";
import { StatCard } from "../ui/StatCard";
import { ChartCard, RankingChart, type ChartDatum } from "./Charts";

type TimeReportSectionProps = {
  from: Date;
  to: Date;
  /** "mine": só o tempo da própria pessoa; "lab": o tempo de todos (coordenador), por pessoa e por projeto. */
  scope: "mine" | "lab";
  profileId: string;
};

const toHours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

// Tempo trabalhado nas tarefas (cronômetro) no período selecionado.
export function TimeReportSection({ from, profileId, scope, to }: TimeReportSectionProps) {
  const t = useT();
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

  if (rows === null) return null;

  if (scope === "mine") {
    const mine = rows.filter((row) => row.profile_id === profileId);
    return (
      <StatCard
        title={t("analytics.myTaskTime")}
        value={formatDuration(totalReportSeconds(mine))}
        description={t("analytics.inPeriod")}
        icon={Timer}
      />
    );
  }

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
