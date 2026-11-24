import { useState } from "react";

import { t } from "../../i18n";
import { notificationGroups, type NotificationGroup } from "../../lib/notifications";
import { useNotifications } from "../layout/NotificationsProvider";
import { Alert } from "../ui/Alert";
import { Card } from "../ui/Card";

const LABELS: Record<NotificationGroup, { title: () => string; hint: () => string }> = {
  bookings: { title: () => t("notifPrefs.bookings"), hint: () => t("notifPrefs.bookingsHint") },
  requests: { title: () => t("notifPrefs.requests"), hint: () => t("notifPrefs.requestsHint") },
  purchases: { title: () => t("notifPrefs.purchases"), hint: () => t("notifPrefs.purchasesHint") },
  feedback: { title: () => t("notifPrefs.feedback"), hint: () => t("notifPrefs.feedbackHint") },
};

// Por assunto: aparecer no sino e/ou avisar no computador. Sem escolha salva, tudo fica ligado.
export function NotificationPreferences() {
  const { preferences, setPreference } = useNotifications();
  const [error, setError] = useState("");

  async function change(topic: NotificationGroup, patch: { in_app?: boolean; push?: boolean }) {
    setError("");
    try {
      await setPreference(topic, patch);
    } catch {
      setError(t("notifPrefs.saveError"));
    }
  }

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h3 className="text-xl font-bold text-text">{t("notifPrefs.title")}</h3>
      <p className="mt-1 text-base text-muted">{t("notifPrefs.subtitle")}</p>
      {error ? (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {notificationGroups.map((topic) => {
          const saved = preferences.find((preference) => preference.topic === topic);
          const inApp = saved?.in_app ?? true;
          const push = (saved?.push ?? true) && inApp;
          return (
            <div key={topic} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-bold text-text">{LABELS[topic].title()}</p>
                <p className="text-sm text-muted">{LABELS[topic].hint()}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex min-h-11 items-center gap-2 text-base font-semibold text-text">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={inApp}
                    onChange={(event) => void change(topic, { in_app: event.target.checked })}
                  />
                  {t("notifPrefs.panel")}
                </label>
                <label className={["flex min-h-11 items-center gap-2 text-base font-semibold", inApp ? "text-text" : "text-muted"].join(" ")}>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={push}
                    disabled={!inApp}
                    onChange={(event) => void change(topic, { push: event.target.checked })}
                  />
                  {t("notifPrefs.desktop")}
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted">{t("notifPrefs.desktopHint")}</p>
    </Card>
  );
}
