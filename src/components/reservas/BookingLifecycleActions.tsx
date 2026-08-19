import { ArrowRight } from "lucide-react";

import {
  getBookingStatusLabel,
  getProximosStatusReserva,
  type BookingStatus,
  type PrinterBooking,
} from "../../lib/domain";
import { Button } from "../ui/Button";

type Props = {
  bookings: PrinterBooking[];
  disabled: boolean;
  onChangeStatus: (booking: PrinterBooking, status: BookingStatus) => void;
};

export function BookingLifecycleActions({ bookings, disabled, onChangeStatus }: Props) {
  const actionable = bookings.filter((booking) => getProximosStatusReserva(booking.status).length > 0);
  if (actionable.length === 0) return null;

  return (
    <section className="mt-4 grid gap-3 border-t border-border pt-3">
      <p className="text-sm font-bold text-text">Ciclo operacional</p>
      {actionable.map((booking) => (
        <div
          key={`status-${booking.id}`}
          className="flex flex-col gap-2 rounded-md bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-sm font-semibold text-text">
            {booking.project_name}: {getBookingStatusLabel(booking.status)}
          </span>
          <div className="flex flex-wrap gap-2">
            {getProximosStatusReserva(booking.status).map((status) => (
              <Button
                key={status}
                className="min-h-8 px-3 py-1.5 text-xs"
                variant={status === "cancelled" ? "danger" : "secondary"}
                disabled={disabled}
                onClick={() => onChangeStatus(booking, status)}
              >
                <ArrowRight className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {getBookingStatusLabel(status)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
