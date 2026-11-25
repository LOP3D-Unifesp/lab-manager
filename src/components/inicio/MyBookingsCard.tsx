import { Link } from "react-router-dom";

import { formatDateTime, useT } from "../../i18n";
import { getBookingStatusLabel, type EquipmentBooking } from "../../lib/domain";
import { HomeCard, HomeEmpty } from "./HomeCard";
import { StatusBadge } from "../ui/StatusBadge";

export function MyBookingsCard({ bookings }: { bookings: EquipmentBooking[] }) {
  const t = useT();

  return (
    <HomeCard title={t("home.myBookings")} to="/reservas/minhas">
      {bookings.length === 0 ? (
        <HomeEmpty>{t("home.noBookings")}</HomeEmpty>
      ) : (
        <ul className="grid gap-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                to={`/reservas?reserva=${booking.id}`}
                className="grid gap-1 rounded-lg border border-border bg-background p-3 transition hover:border-primary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-base font-bold text-text">{booking.equipment?.name ?? t("dashboard.equipmentRemoved")}</p>
                  <StatusBadge
                    label={getBookingStatusLabel(booking.status)}
                    variant={booking.status === "pending" ? "warning" : booking.status === "in_progress" ? "info" : "success"}
                  />
                </div>
                <p className="text-sm text-muted">
                  {formatDateTime(booking.starts_at, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {booking.project_name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}
