import { Menu } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import {
  mobileActionNavigationItem,
  mobilePrimaryNavigationItems,
  mobileSecondaryNavigationItems,
  type NavigationItem,
} from "../../lib/navigation";
import { useAuth } from "../../lib/auth";

function canShowMobileItem(item: NavigationItem, role?: string) {
  return !item.mobileRole || item.mobileRole === role;
}

function getRegularItemClass(isActive: boolean) {
  return [
    "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[12px] font-bold leading-none transition",
    isActive
      ? "bg-primary-soft text-primary-dark"
      : "text-muted hover:bg-background hover:text-primary",
  ].join(" ");
}

export function MobileNavigation() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const secondaryNavigationId = "mobile-secondary-navigation";
  const primaryItems = mobilePrimaryNavigationItems.filter((item) =>
    canShowMobileItem(item, profile?.role),
  );
  const secondaryItems = mobileSecondaryNavigationItems.filter((item) =>
    canShowMobileItem(item, profile?.role),
  );
  const actionItem =
    mobileActionNavigationItem &&
    canShowMobileItem(mobileActionNavigationItem, profile?.role)
      ? mobileActionNavigationItem
      : null;
  const firstPrimaryItems = primaryItems.slice(0, 2);
  const lastPrimaryItems = primaryItems.slice(2);

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-soft lg:hidden"
    >
      {isOpen ? (
        <div
          id={secondaryNavigationId}
          className="mb-3 overflow-hidden rounded-lg border border-border bg-background shadow-soft"
        >
          {secondaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                [
                  "flex min-h-11 items-center gap-3 border-b border-border px-3 py-2.5 text-[15px] font-semibold last:border-b-0",
                  isActive
                    ? "bg-primary-soft text-primary-dark"
                    : "text-text hover:bg-surface hover:text-primary",
                ].join(" ")
              }
            >
              <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{item.mobileLabel}</span>
            </NavLink>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-5 items-end gap-1">
        {firstPrimaryItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => getRegularItemClass(isActive)}
          >
            <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="max-w-full whitespace-nowrap leading-none">
              {item.mobileLabel}
            </span>
          </NavLink>
        ))}

        {actionItem ? (
          <NavLink
            to={actionItem.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              [
                "-mt-5 flex h-[70px] min-w-0 flex-col items-center justify-center gap-1 rounded-full border-4 border-surface px-1 text-[12px] font-bold leading-none shadow-soft transition",
                isActive
                  ? "bg-success-dark text-white"
                  : "bg-success text-white hover:bg-success-dark",
              ].join(" ")
            }
          >
            <actionItem.icon
              aria-hidden="true"
              className="h-6 w-6 shrink-0"
            />
            <span className="max-w-full whitespace-nowrap leading-none">
              {actionItem.mobileLabel}
            </span>
          </NavLink>
        ) : null}

        {lastPrimaryItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => getRegularItemClass(isActive)}
          >
            <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="max-w-full whitespace-nowrap leading-none">
              {item.mobileLabel}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          aria-controls={secondaryNavigationId}
          aria-expanded={isOpen}
          aria-label="Abrir navegação secundária"
          onClick={() => setIsOpen((current) => !current)}
          className={[
            "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[12px] font-bold leading-none transition",
            isOpen
              ? "bg-primary-soft text-primary-dark"
              : "text-muted hover:bg-background hover:text-primary",
          ].join(" ")}
        >
          <Menu aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap leading-none">Mais</span>
        </button>
      </div>
    </nav>
  );
}
