import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { navigationItems, type NavigationItem } from "../../lib/navigation";
import { AuthUserMenu } from "./AuthUserMenu";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { NotificationBell } from "./NotificationBell";

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
    "group relative flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5 text-[16px] font-semibold transition",
    isActive
      ? "bg-primary-soft text-primary-dark"
      : "text-text hover:bg-background hover:text-primary",
  ].join(" ");
}

function SidebarNavItem({
  item,
  showDivider,
}: {
  item: NavigationItem;
  showDivider: boolean;
}) {
  return (
    <div className={showDivider ? "mt-3 border-t border-border pt-3" : ""}>
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
                isActive ? "bg-primary" : "bg-transparent",
              ].join(" ")}
            />
            <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="min-w-0 truncate">{item.desktopLabel}</span>
          </>
        )}
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const { labSettings, profile } = useAuth();
  const visibleNavigationItems = getVisibleDesktopItems(profile?.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-surface px-4 py-5 lg:block">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border pb-5">
          <div className="flex items-start justify-between gap-2">
            <Link
              to="/"
              aria-label="Ir para o início"
              className="block min-w-0 rounded-md transition hover:text-primary focus-visible:outline-offset-4"
            >
              <div className="flex items-center gap-2">
                <p className="text-base font-bold leading-none text-primary">
                  {labSettings?.acronym ?? "Lab"}
                </p>
                <EnvironmentBadge />
              </div>
              <h1 className="mt-1 truncate text-[24px] font-bold leading-tight text-text">
                Lab Manager
              </h1>
            </Link>
            <NotificationBell align="left" />
          </div>
          <p className="mt-2 text-sm font-semibold leading-5 text-muted">
            {labSettings?.name ?? "Gestão interna do laboratório."}
          </p>
        </div>

        <nav
          aria-label="Navegação principal"
          className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
        >
          {visibleNavigationItems.map((item, index) => {
            const previousItem = visibleNavigationItems[index - 1];
            const showDivider =
              item.desktopSection === "management" &&
              previousItem?.desktopSection !== "management";

            return (
              <SidebarNavItem
                key={item.path}
                item={item}
                showDivider={showDivider}
              />
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
