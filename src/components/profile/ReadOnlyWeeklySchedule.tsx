import { Utensils } from "lucide-react";

import { t } from "../../i18n";
import { getSlotColorClassName, getWorkModeLabel, type AvailabilitySlot } from "../../lib/domain";
import { useLabSchedule } from "../../lib/labSchedule";

type ReadOnlyWeeklyScheduleProps = {
  slots: AvailabilitySlot[];
};

// Agenda semanal de uma pessoa, só para ler: linhas são os períodos (e intervalos de refeição), colunas os dias de funcionamento.
export function ReadOnlyWeeklySchedule({ slots }: ReadOnlyWeeklyScheduleProps) {
  const { operatingWeekdays, timeline } = useLabSchedule();
  const days = [...operatingWeekdays].sort((a, b) => a - b);

  if (days.length === 0 || timeline.length === 0 || slots.length === 0) {
    return <p className="text-base text-muted">{t("profile.noSchedule")}</p>;
  }

  const modeOf = (weekday: number, periodId: string) =>
    slots.find((slot) => slot.weekday === weekday && slot.schedule_period_id === periodId)?.work_mode;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 px-2 py-2 text-left font-semibold text-muted" scope="col" />
            {days.map((weekday) => (
              <th className="px-2 py-2 text-center font-semibold text-muted" key={weekday} scope="col">
                {t(`weekday.${weekday}` as Parameters<typeof t>[0])}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeline.map((item) =>
            item.kind === "break" ? (
              <tr key={item.id}>
                <td className="px-2 py-1.5 text-center text-xs font-semibold text-warning-dark" colSpan={days.length + 1}>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-3 py-1">
                    <Utensils aria-hidden="true" className="h-3.5 w-3.5" />
                    {item.label} · {item.horario}
                  </span>
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <th className="px-2 py-1.5 text-left font-semibold text-text" scope="row">
                  {item.label}
                </th>
                {days.map((weekday) => {
                  const mode = modeOf(weekday, item.id);
                  return (
                    <td className="px-1 py-1" key={weekday}>
                      <div
                        aria-label={`${t(`weekday.${weekday}` as Parameters<typeof t>[0])} ${item.label}: ${getWorkModeLabel(mode)}`}
                        className={[
                          "flex min-h-10 items-center justify-center rounded-md border px-1 text-center text-xs font-bold",
                          mode ? getSlotColorClassName(mode) : "border-border bg-background text-muted",
                        ].join(" ")}
                      >
                        {getWorkModeLabel(mode)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
