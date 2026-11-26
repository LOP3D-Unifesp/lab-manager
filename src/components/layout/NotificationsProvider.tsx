import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../../lib/auth";
import { showDesktopAlert, syncPushSubscription } from "../../lib/desktopAlerts";
import { describeAlertBody } from "../../lib/notificationAlert";
import { describeNotification, getNotificationGroup, type AppNotification, type NotificationGroup } from "../../lib/notifications";
import {
  countUnreadNotifications,
  listNotificationPreferences,
  listNotifications,
  markNotificationsRead,
  saveNotificationPreference,
  type NotificationPreference,
} from "../../lib/supabaseRepository";
import { supabase } from "../../lib/supabaseClient";

const PAGE_SIZE = 50;
// Eventos em rajada (aprovações em lote) viram uma só consulta.
const REFETCH_DEBOUNCE_MS = 750;
// Plano B quando o canal em tempo real cai.
const FALLBACK_POLL_MS = 60_000;

type NotificationsState = {
  items: AppNotification[];
  unread: number;
  error: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  /** Marca como lidas as notificações indicadas (por id). */
  markRead: (ids: string[]) => Promise<void>;
  /** Marca como lidas todas (ou só as dos tipos informados). */
  markAllRead: (types?: string[]) => Promise<void>;
  /** Preferências por assunto; sem linha, vale o padrão (tudo ligado). */
  preferences: NotificationPreference[];
  setPreference: (topic: NotificationGroup, change: Partial<Pick<NotificationPreference, "in_app" | "push">>) => Promise<void>;
};

const emptyState: NotificationsState = {
  items: [],
  unread: 0,
  error: false,
  hasMore: false,
  loadMore: async () => undefined,
  markRead: async () => undefined,
  markAllRead: async () => undefined,
  preferences: [],
  setPreference: async () => undefined,
};

const NotificationsContext = createContext<NotificationsState>(emptyState);

// Notificações da pessoa logada, guardadas no banco: o "lido" vale em qualquer aparelho.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const preferencesRef = useRef<NotificationPreference[]>([]);
  preferencesRef.current = preferences;
  const itemsRef = useRef<AppNotification[]>([]);
  itemsRef.current = items;

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!profileId) return;
      try {
        const [first, count] = await Promise.all([listNotifications(PAGE_SIZE, undefined, signal), countUnreadNotifications(signal)]);
        if (signal?.aborted) return;
        // Mantém o que já foi carregado em "ver mais" e atualiza só a primeira página.
        setItems((current) => {
          const older = current.filter((item) => !first.some((fresh) => fresh.id === item.id) && first.length > 0 && item.created_at < first[first.length - 1].created_at);
          return [...first, ...older];
        });
        setHasMore((current) => current || first.length === PAGE_SIZE);
        setUnread(count);
        setError(false);
      } catch {
        if (!signal?.aborted) setError(true);
      }
    },
    [profileId],
  );

  useEffect(() => {
    if (!profileId || !supabase) {
      setItems([]);
      setUnread(0);
      setError(false);
      setHasMore(false);
      setPreferences([]);
      return undefined;
    }

    const controller = new AbortController();
    let debounce: number | undefined;
    let poll: number | undefined;
    // Aviso do sistema (só com a aba em segundo plano e sem push ativo, ver showDesktopAlert), se a pessoa não desligou o assunto.
    const avisarNoComputador = (notification: AppNotification) => {
      const group = getNotificationGroup(notification.type);
      if (preferencesRef.current.find((preference) => preference.topic === group)?.push === false) return;
      const { title } = describeNotification(notification);
      showDesktopAlert({ title, body: describeAlertBody(notification), path: notification.link ?? "/", tag: notification.id });
    };
    const agendar = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void refresh(controller.signal), REFETCH_DEBOUNCE_MS);
    };

    void refresh(controller.signal);
    listNotificationPreferences()
      .then((saved) => !controller.signal.aborted && setPreferences(saved))
      .catch(() => undefined);
    // Se os avisos estão ligados, garante que a assinatura de push deste navegador pertence a quem está logado.
    void syncPushSubscription();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(controller.signal);
    };
    document.addEventListener("visibilitychange", onVisible);

    const client = supabase;
    const channel = client
      .channel(`notifications_${profileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${profileId}` }, (payload) => {
        agendar();
        if (payload.eventType === "INSERT") avisarNoComputador(payload.new as AppNotification);
      })
      .subscribe((status) => {
        window.clearInterval(poll);
        if (status !== "SUBSCRIBED") poll = window.setInterval(() => void refresh(controller.signal), FALLBACK_POLL_MS);
      });

    return () => {
      controller.abort();
      window.clearTimeout(debounce);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [profileId, refresh]);

  const loadMore = useCallback(async () => {
    const last = itemsRef.current[itemsRef.current.length - 1];
    if (!last) return;
    try {
      const page = await listNotifications(PAGE_SIZE, last.created_at);
      setItems((current) => [...current, ...page.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      setError(true);
    }
  }, []);

  const applyRead = useCallback((match: (item: AppNotification) => boolean) => {
    const now = new Date().toISOString();
    let changed = 0;
    setItems((current) =>
      current.map((item) => {
        if (item.read_at || !match(item)) return item;
        changed += 1;
        return { ...item, read_at: now };
      }),
    );
    return changed;
  }, []);

  const markRead = useCallback(
    async (ids: string[]) => {
      const targets = itemsRef.current.filter((item) => ids.includes(item.id) && !item.read_at).map((item) => item.id);
      if (targets.length === 0) return;
      applyRead((item) => targets.includes(item.id));
      setUnread((current) => Math.max(0, current - targets.length));
      try {
        await markNotificationsRead({ ids: targets });
      } catch {
        void refresh();
      }
    },
    [applyRead, refresh],
  );

  const markAllRead = useCallback(
    async (types?: string[]) => {
      applyRead((item) => !types || types.includes(item.type));
      try {
        await markNotificationsRead(types ? { types } : {});
      } finally {
        void refresh();
      }
    },
    [applyRead, refresh],
  );

  const setPreference = useCallback(
    async (topic: NotificationGroup, change: Partial<Pick<NotificationPreference, "in_app" | "push">>) => {
      if (!profileId) return;
      const current = preferencesRef.current.find((preference) => preference.topic === topic) ?? { topic, in_app: true, push: true };
      const next: NotificationPreference = { ...current, ...change };
      const before = preferencesRef.current;
      setPreferences([...before.filter((preference) => preference.topic !== topic), next]);
      try {
        await saveNotificationPreference(profileId, next);
      } catch (reason) {
        setPreferences(before);
        throw reason;
      }
    },
    [profileId],
  );

  const value = useMemo(
    () => ({ items, unread, error, hasMore, loadMore, markRead, markAllRead, preferences, setPreference }),
    [items, unread, error, hasMore, loadMore, markRead, markAllRead, preferences, setPreference],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
