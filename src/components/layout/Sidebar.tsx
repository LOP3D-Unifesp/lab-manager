import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

function getNavItemClass(isActive: boolean, collapsed: boolean) {
  return [
    "group relative flex min-h-10 items-center rounded-lg py-2 text-[16px] font-semibold transition",
    collapsed ? "justify-center px-0" : "gap-3 px-3.5",
    isActive
      ? "bg-primary-soft text-primary-dark"
      : "text-text hover:bg-background hover:text-primary",
  ].join(" ");
}

function SidebarNavItem({ badge, collapsed, item }: { badge?: number; collapsed: boolean; item: NavigationItem }) {
  const t = useT();
  const label = t(navLabelKey(item, "desktop"));
  return (
    <div>
      <NavLink
        to={item.path}
        end={item.path === "/" || item.path === "/administracao"}
        className={({ isActive }) => getNavItemClass(isActive, collapsed)}
        title={collapsed ? label : undefined}
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
            <span className={collapsed ? "sr-only" : "min-w-0 truncate"}>{label}</span>
            {badge ? (
              <span
                aria-label={t("common.pending", { count: badge })}
                className={[
                  "inline-flex items-center justify-center rounded-full bg-warning font-bold text-[#102033] dark:border dark:border-warning/60 dark:bg-warning-soft dark:text-warning-dark",
                  collapsed ? "absolute right-0.5 top-0 min-w-4 px-1 text-[10px] leading-4" : "ml-auto min-w-6 px-2 py-0.5 text-xs",
                ].join(" ")}
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

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
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

  const toggleLabel = t(collapsed ? "sidebar.expand" : "sidebar.collapse");
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface py-5 lg:block",
        collapsed ? "w-20 px-2" : "w-80 px-4",
      ].join(" ")}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className={["border-b border-border", collapsed ? "grid justify-items-center gap-3 pb-3" : "pb-5"].join(" ")}>
          <div className={collapsed ? "contents" : "flex items-start justify-between gap-2"}>
            <Link
              to="/"
              aria-label={t("nav.home")}
              className="block min-w-0 max-w-full rounded-md transition hover:text-primary focus-visible:outline-offset-4"
            >
              <div className="flex items-center gap-2">
                <LabLogo
                  alt={labSettings?.name ?? t("logo.alt")}
                  className={collapsed ? "h-8 max-w-[3.75rem]" : "h-9 max-w-[9rem]"}
                  favicon
                  logos={labSettings}
                  fallback={
                    <p className={["font-bold leading-none text-primary", collapsed ? "max-w-[3.75rem] truncate text-sm" : "text-base"].join(" ")}>
                      {labSettings?.acronym ?? "Lab"}
                    </p>
                  }
                />
                {collapsed ? null : <EnvironmentBadge />}
              </div>
              {collapsed ? null : (
                <h1 className="font-display mt-1 truncate text-[24px] font-bold leading-tight text-text">
                  Lab Manager
                </h1>
              )}
            </Link>
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={onToggle}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-primary"
            >
              <ToggleIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {collapsed ? null : (
            <p className="mt-2 text-sm font-semibold leading-5 text-muted">
              {labSettings?.name ?? t("sidebar.fallbackSubtitle")}
            </p>
          )}
        </div>

        <nav
          aria-label={t("nav.main")}
          className={["min-h-0 flex-1 space-y-1 overflow-y-auto", collapsed ? "mt-3 overflow-x-hidden" : "-mr-2 mt-5 pr-2"].join(" ")}
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
                  collapsed ? (
                    <hr className="mx-3 my-2 border-border" />
                  ) : (
                    <p className="mt-4 px-3.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted">
                      {t(`navSection.${item.desktopSection}` as MessageKey)}
                    </p>
                  )
                ) : null}
                <SidebarNavItem collapsed={collapsed} item={item} badge={badgeFor(item.path)} />
              </div>
            );
          })}
        </nav>

        <div className={["border-t border-border pt-3", collapsed ? "mt-3" : "mt-5"].join(" ")}>
          <AuthUserMenu collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
