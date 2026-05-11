import { Menu } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import {
  mobilePrimaryNavigationItems,
  mobileSecondaryNavigationItems,
} from "../../lib/navigation";
import { useAuth } from "../../lib/auth";

export function MobileNavigation() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const secondaryNavigationId = "mobile-secondary-navigation";
  const primaryItems = mobilePrimaryNavigationItems.filter((item) => {
    return item.path !== "/administracao" || profile?.role === "coordinator";
  });
  const secondaryItems = mobileSecondaryNavigationItems.filter((item) => {
    return item.path !== "/administracao" || profile?.role === "coordinator";
  });

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-3 pt-2 shadow-soft lg:hidden"
    >
      {isOpen ? (
        <div
          id={secondaryNavigationId}
          className="mb-2 rounded-lg border border-border bg-background p-2"
        >
          {secondaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                [
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-base font-semibold",
                  isActive ? "bg-primary-dark text-white" : "text-text",
                ].join(" ")
              }
            >
              <item.icon aria-hidden="true" className="h-5 w-5" />
              <span>{item.mobileLabel}</span>
            </NavLink>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-5 gap-1">
        {primaryItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              [
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-base font-semibold transition",
                isActive
                  ? "bg-primary-dark text-white"
                  : "text-muted hover:bg-background hover:text-primary",
              ].join(" ")
            }
          >
            <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="leading-tight">{item.mobileLabel}</span>
          </NavLink>
        ))}

        <button
          type="button"
          aria-controls={secondaryNavigationId}
          aria-expanded={isOpen}
          aria-label="Abrir navegação secundária"
          onClick={() => setIsOpen((current) => !current)}
          className={[
            "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-base font-semibold transition",
            isOpen
              ? "bg-primary-dark text-white"
              : "text-muted hover:bg-background hover:text-primary",
          ].join(" ")}
        >
          <Menu aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="leading-tight">Mais</span>
        </button>
      </div>
    </nav>
  );
}
