import { Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { formatDateTime, useT } from "../../i18n";
import { type EquipmentBooking } from "../../lib/domain";
import { isBookingHappeningNow } from "../../lib/inicio";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type NowCardProps = {
  nextBooking: EquipmentBooking | undefined;
  now: Date;
  /** Texto da presença de hoje ("Manhã (presencial)"); vazio quando a pessoa não está na lista. */
  presence: string;
};

// Faixa "Agora": a reserva em andamento ou a próxima, e onde a pessoa estará hoje.
export function NowCard({ nextBooking, now, presence }: NowCardProps) {
  const t = useT();
  const happening = nextBooking ? isBookingHappeningNow(nextBooking, now) : false;
  const range = nextBooking
    ? `${formatDateTime(nextBooking.starts_at, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} – ${formatDateTime(nextBooking.ends_at, { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <Card className="grid gap-4 border-primary bg-primary-soft p-4 sm:p-5 md:grid-cols-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-dark">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {happening ? t("home.nowHappening") : t("home.nextBooking")}
        </p>
        {nextBooking ? (
          <Link className="mt-2 block rounded-lg hover:text-primary" to={`/reservas?reserva=${nextBooking.id}`}>
            <p className="break-words text-xl font-bold text-text">{nextBooking.equipment?.name ?? t("dashboard.equipmentRemoved")}</p>
            <p className="mt-1 text-base text-text">{range}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="break-words">{nextBooking.project_name}</span>
              {nextBooking.status === "pending" ? <StatusBadge label={t("bookingStatus.pending")} variant="warning" /> : null}
            </p>
          </Link>
        ) : (
          <p className="mt-2 text-base text-text">{t("home.noBookings")}</p>
        )}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-dark">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {t("home.todayPresence")}
        </p>
        <p className="mt-2 break-words text-base text-text">{presence || t("dashboard.youAreNotOnList")}</p>
        <Link className="mt-1 inline-block text-sm font-semibold text-primary hover:text-primary-dark" to="/perfil">
          {t("home.editSchedule")}
        </Link>
      </div>
    </Card>
  );
}
