import { LabTodayOverview } from "../components/inicio/LabTodayOverview";
import { PageHeader } from "../components/ui/PageHeader";
import { useT } from "../i18n";

// Números do laboratório. Por enquanto traz o retrato de hoje (que saiu da Inicial); os gráficos por período entram em seguida.
export function Analytics() {
  const t = useT();

  return (
    <div>
      <PageHeader title={t("analytics.title")} description={t("analytics.subtitle")} />
      <LabTodayOverview />
    </div>
  );
}
