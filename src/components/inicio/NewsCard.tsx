import { useT } from "../../i18n";
import { useNotifications } from "../layout/NotificationsProvider";
import { NotificationRow } from "../layout/NotificationRow";
import { HomeCard, HomeEmpty } from "./HomeCard";

const VISIBLE = 5;

// Últimas novidades (avisos não lidos primeiro); o histórico completo fica em /notificacoes.
export function NewsCard() {
  const t = useT();
  const { items, markRead, unread } = useNotifications();
  const latest = [...items].sort((a, b) => Number(!!a.read_at) - Number(!!b.read_at)).slice(0, VISIBLE);

  return (
    <HomeCard title={unread > 0 ? t("home.newsUnread", { count: unread }) : t("home.news")} to="/notificacoes">
      {latest.length === 0 ? (
        <HomeEmpty>{t("home.noNews")}</HomeEmpty>
      ) : (
        <ul className="grid gap-1">
          {latest.map((notification) => (
            <li key={notification.id}>
              <NotificationRow notification={notification} onOpen={(item) => void markRead([item.id])} />
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}
