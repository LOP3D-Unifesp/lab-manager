import { Link, NavLink } from "react-router-dom";

import { useT, type MessageKey } from "../../i18n";
import { navLabelKey } from "../../i18n/navLabels";
import { useAuth } from "../../lib/auth";
import { navigationItems, navigationSectionLabels, type NavigationItem } from "../../lib/navigation";
import { useAttention } from "./AttentionProvider";
import { useNotifications } from "./NotificationsProvider";
import { LabLogo } from "../ui/LabLogo";
import { AuthUserMenu } from "./AuthUserMenu";
import { EnvironmentBadge } from "./EnvironmentBadge";

function canShowDesktopItem(item: NavigationItem, role?: string) {
  return (
    item.desktopSection !== "account" &&
    (!item.desktopRole || item.desktopRole === role)
  );
}

function getVisibleDesktopItems(role?: string) {
  return navigationItems
    .filter((item) => canShowDesktopItem(item, role))
    .sort((a, b) => a.desktopOrder - b.desktopOrder);
}

function getNavItemClass(isActive: boolean) {
  return [
    "group relative flex min-h-10 items-center gap-3 rounded-lg px-3.5 py-2 text-[16px] font-semibold transition",
    isActive
      ? "bg-primary-soft text-primary-dark"
      : "text-text hover:bg-background hover:text-primary",
  ].join(" ");
}

function SidebarNavItem({ badge, item }: { badge?: number; item: NavigationItem }) {
  const t = useT();
  return (
    <div>
      <NavLink
        to={item.path}
        end={item.path === "/" || item.path === "/administracao"}
        className={({ isActive }) => getNavItemClass(isActive)}
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={[
                "absolute left-0 top-2 h-[calc(100%-1rem)] w-1 rounded-r-full transition",
                isActive ? "bg-accent" : "bg-transparent",
              ].join(" ")}
            />
            <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="min-w-0 truncate">{t(navLabelKey(item, "desktop"))}</span>
            {badge ? (
              <span
                aria-label={t("common.pending", { count: badge })}
                className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-[#102033] dark:border dark:border-warning/60 dark:bg-warning-soft dark:text-warning-dark"
              >
                {badge}
              </span>
            ) : null}
          </>
        )}
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const t = useT();
  const { labSettings, profile } = useAuth();
  const visibleNavigationItems = getVisibleDesktopItems(profile?.role);
  const attention = useAttention();
  const { items: notificacoes } = useNotifications();
  // Quem pede compras vê o selo quando há decisão nova sobre um pedido seu; o coordenador, os pedidos aguardando.
  const novidadesDeCompras = notificacoes.filter((item) => item.type === "purchase_status" && !item.read_at).length;
  const badgeFor = (path: string) =>
    path === "/feedback"
      ? attention.feedback
      : path === "/equipamentos"
        ? attention.maintenanceRequests
        : path === "/compras"
          ? attention.purchases + novidadesDeCompras
          : undefined;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-border bg-surface px-4 py-5 lg:block">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border pb-5">
          <div className="flex items-start justify-between gap-2">
            <Link
              to="/"
              aria-label={t("nav.home")}
              className="block min-w-0 rounded-md transition hover:text-primary focus-visible:outline-offset-4"
            >
              <div className="flex items-center gap-2">
                <LabLogo
                  alt={labSettings?.name ?? t("logo.alt")}
                  className="h-9 max-w-[9rem]"
                  favicon
                  logos={labSettings}
                  fallback={
                    <p className="text-base font-bold leading-none text-primary">
                      {labSettings?.acronym ?? "Lab"}
                    </p>
                  }
                />
                <EnvironmentBadge />
              </div>
              <h1 className="font-display mt-1 truncate text-[24px] font-bold leading-tight text-text">
                Lab Manager
              </h1>
            </Link>
          </div>
          <p className="mt-2 text-sm font-semibold leading-5 text-muted">
            {labSettings?.name ?? t("sidebar.fallbackSubtitle")}
          </p>
        </div>

        <nav
          aria-label={t("nav.main")}
          className="-mr-2 mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2"
        >
          {visibleNavigationItems.map((item, index) => {
            const previousItem = visibleNavigationItems[index - 1];
            const sectionLabel =
              item.desktopSection !== previousItem?.desktopSection
                ? navigationSectionLabels[item.desktopSection]
                : null;

            return (
              <div key={item.path}>
                {sectionLabel ? (
                  <p className="mt-4 px-3.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted">
                    {t(`navSection.${item.desktopSection}` as MessageKey)}
                  </p>
                ) : null}
                <SidebarNavItem item={item} badge={badgeFor(item.path)} />
              </div>
            );
          })}
        </nav>

        <div className="mt-5 border-t border-border pt-3">
          <AuthUserMenu />
        </div>
      </div>
    </aside>
  );
}
