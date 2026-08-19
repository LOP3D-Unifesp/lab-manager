import { useEffect, useMemo, useState } from "react";

import { useAuth } from "./auth";
import {
  buildLabScheduleTimeline,
  formatSchedulePeriod,
  type LabScheduleBreakItem,
  type LabSchedulePeriod,
  type LabSchedulePeriodItem,
} from "./domain";
import { listLabSchedulePeriods } from "./supabaseRepository";

export function useLabSchedule() {
  const { labSettings } = useAuth();
  const [schedulePeriods, setSchedulePeriods] = useState<LabSchedulePeriod[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  useEffect(() => {
    let active = true;
    listLabSchedulePeriods().then((periods) => {
      if (active) setSchedulePeriods(periods);
    }).finally(() => { if (active) setLoadingSchedule(false); });
    return () => { active = false; };
  }, []);

  const periodos = useMemo<LabSchedulePeriodItem[]>(() => schedulePeriods.map((period) => ({
    kind: "period",
    id: period.id,
    starts_at: period.starts_at.slice(0, 5),
    ends_at: period.ends_at.slice(0, 5),
    label: formatSchedulePeriod(period.starts_at, period.ends_at),
    horario: formatSchedulePeriod(period.starts_at, period.ends_at),
  })), [schedulePeriods]);

  const mealBreaks = useMemo<LabScheduleBreakItem[]>(() => labSettings ? [
    {
      kind: "break", id: "lunch", label: "Almoço",
      starts_at: labSettings.lunch_starts_at.slice(0, 5),
      ends_at: labSettings.lunch_ends_at.slice(0, 5),
      horario: formatSchedulePeriod(labSettings.lunch_starts_at, labSettings.lunch_ends_at),
    },
    {
      kind: "break", id: "dinner", label: "Jantar",
      starts_at: labSettings.dinner_starts_at.slice(0, 5),
      ends_at: labSettings.dinner_ends_at.slice(0, 5),
      horario: formatSchedulePeriod(labSettings.dinner_starts_at, labSettings.dinner_ends_at),
    },
  ] : [], [labSettings]);

  const timeline = useMemo(
    () => buildLabScheduleTimeline(periodos, mealBreaks),
    [periodos, mealBreaks],
  );

  return {
    periodos,
    mealBreaks,
    timeline,
    operatingWeekdays: labSettings?.operating_weekdays ?? [1, 2, 3, 4, 5],
    workspaceCapacity: labSettings?.workspace_capacity ?? 10,
    loadingSchedule,
  };
}
