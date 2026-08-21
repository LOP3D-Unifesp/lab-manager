import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./auth";
import { supabase } from "./supabaseClient";
import { getEventoNotificacaoReserva, type BookingAlertSummary } from "./domain";
import {
  listCoordinatorBookingsAlertsSummary,
  listMyBookingAlertsSummary,
} from "./supabaseRepository";

// Realtime events can arrive in bursts (bulk approvals, updates to unrelated
// columns); coalesce them into a single refetch.
const ALERT_REFETCH_DEBOUNCE_MS = 750;
// If the realtime channel is down, fall back to polling so alerts keep flowing.
const ALERT_FALLBACK_POLL_MS = 60_000;

type BookingsAlertState = {
  notifications: BookingAlertSummary[];
  count: number;
  error: boolean;
  // Marks informational notifications as seen (clears the unseen part of the
  // badge). Actionable pending bookings keep counting for coordinators.
  markSeen: () => void;
};

function getSeenStorageKey(profileId: string) {
  return `lab_booking_alert_seen_${profileId}`;
}

function useBookingsAlertData(profileId: string, isCoordinator: boolean) {
  const [notifications, setNotifications] = useState<BookingAlertSummary[]>([]);
  const [error, setError] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (profileId) {
      setLastSeen(window.localStorage.getItem(getSeenStorageKey(profileId)));
    }
  }, [profileId]);

  const fetchBookings = useCallback(
    (signal: AbortSignal) =>
      isCoordinator
        ? listCoordinatorBookingsAlertsSummary(profileId, signal)
        : listMyBookingAlertsSummary(profileId, signal),
    [isCoordinator, profileId],
  );

  useEffect(() => {
    if (!profileId || !supabase) {
      setNotifications([]);
      setError(false);
      return;
    }
    const client = supabase;

    let active = true;
    const controller = new AbortController();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    async function refetch() {
      try {
        const data = await fetchBookings(controller.signal);
        if (!active) return;
        setNotifications(data);
        setError(false);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        // Keep the last known list; only surface that something went wrong.
        setError(true);
      }
    }

    function scheduleRefetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (active) refetch();
      }, ALERT_REFETCH_DEBOUNCE_MS);
    }

    function startFallbackPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(refetch, ALERT_FALLBACK_POLL_MS);
    }

    function stopFallbackPolling() {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }

    refetch();

    // The researcher's channel is filtered to their own bookings so realtime
    // payloads never carry other users' booking details to the client.
    const channel = client
      .channel(`printer_bookings_alert_${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "printer_bookings",
          ...(isCoordinator ? {} : { filter: `profile_id=eq.${profileId}` }),
        },
        scheduleRefetch,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          startFallbackPolling();
        } else if (status === "SUBSCRIBED") {
          stopFallbackPolling();
        }
      });

    return () => {
      active = false;
      controller.abort();
      clearTimeout(debounceTimer);
      stopFallbackPolling();
      client.removeChannel(channel);
    };
  }, [fetchBookings, profileId]);

  const markSeen = useCallback(() => {
    if (!profileId) return;

    const proximoVisto = notifications.reduce<string | null>((atual, reserva) => {
      const evento = getEventoNotificacaoReserva(reserva, profileId);
      if (evento && (!atual || evento > atual)) return evento;
      return atual;
    }, null);

    if (proximoVisto) {
      window.localStorage.setItem(getSeenStorageKey(profileId), proximoVisto);
    }
    setLastSeen((atual) =>
      proximoVisto && (!atual || proximoVisto > atual) ? proximoVisto : atual,
    );
  }, [notifications, profileId]);

  // Actionable pending bookings always count for the coordinator; outcome
  // notifications (researcher view, cancellations) only count until seen.
  const count = isCoordinator
    ? notifications.filter((reserva) => reserva.status === "pending").length +
      notifications.filter((reserva) => {
        if (reserva.status !== "cancelled") return false;
        const evento = getEventoNotificacaoReserva(reserva, profileId);
        return Boolean(evento && (!lastSeen || evento > lastSeen));
      }).length
    : notifications.filter((reserva) => {
        const evento = getEventoNotificacaoReserva(reserva, profileId);
        return Boolean(evento && (!lastSeen || evento > lastSeen));
      }).length;

  return { notifications, count, error, markSeen };
}

const BookingsAlertContext = createContext<BookingsAlertState | null>(null);

type BookingsAlertProviderProps = {
  children: ReactNode;
};

// Mounted once in AppLayout so the desktop sidebar and the mobile header bells
// share a single fetch + realtime channel instead of one pair each.
export function BookingsAlertProvider({ children }: BookingsAlertProviderProps) {
  const { profile } = useAuth();
  const isCoordinator = profile?.role === "coordinator";
  const alert = useBookingsAlertData(profile?.id ?? "", isCoordinator);

  return <BookingsAlertContext.Provider value={alert}>{children}</BookingsAlertContext.Provider>;
}

export function useBookingsAlert() {
  const context = useContext(BookingsAlertContext);
  if (!context) {
    throw new Error("useBookingsAlert deve ser usado dentro de BookingsAlertProvider");
  }
  return context;
}
