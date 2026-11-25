import { useT } from "../../i18n";
import type { EquipmentCounts } from "../../lib/inicio";
import { HomeCard, HomeEmpty } from "./HomeCard";

function Figure({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <span className="min-w-0 break-words text-base font-semibold text-text">{label}</span>
      <span className={`font-display text-3xl font-bold leading-none ${tone}`}>{value}</span>
    </li>
  );
}

// Quantos equipamentos o laboratório tem e quantos estão ativos, em manutenção ou parados.
export function EquipmentCard({ counts }: { counts: EquipmentCounts }) {
  const t = useT();

  return (
    <HomeCard title={t("home.equipment")} to="/equipamentos">
      {counts.total === 0 ? (
        <HomeEmpty>{t("dashboard.noEquipment")}</HomeEmpty>
      ) : (
        <>
          <p className="mb-3 text-base text-muted">{t("home.equipmentTotal", { count: counts.total })}</p>
          <ul className="grid gap-2">
            <Figure label={t("home.equipmentActive")} tone="text-success-dark" value={counts.active} />
            <Figure label={t("home.equipmentMaintenance")} tone={counts.maintenance > 0 ? "text-warning-dark" : "text-text"} value={counts.maintenance} />
            <Figure label={t("home.equipmentStopped")} tone={counts.stopped > 0 ? "text-danger-dark" : "text-text"} value={counts.stopped} />
          </ul>
          {counts.other > 0 ? <p className="mt-2 text-sm text-muted">{t("home.equipmentOther", { count: counts.other })}</p> : null}
        </>
      )}
    </HomeCard>
  );
}
