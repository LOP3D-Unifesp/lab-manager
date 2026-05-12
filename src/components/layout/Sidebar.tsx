import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { navigationItems } from "../../lib/navigation";
import { AuthUserMenu } from "./AuthUserMenu";

export function Sidebar() {
  const { profile } = useAuth();
  const visibleNavigationItems = navigationItems.filter((item) => {
    return item.path !== "/administracao" || profile?.role === "coordinator";
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-surface px-5 py-6 lg:block">
      <div className="mb-8 border-b border-border pb-6">
        <Link
          to="/"
          aria-label="Ir para o início"
          className="block rounded-md transition hover:text-primary focus-visible:outline-offset-4"
        >
          <p className="text-lg font-semibold text-primary">LO&P3D</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight text-text">
            Lab Manager
          </h1>
        </Link>
        <p className="mt-2 text-base leading-6 text-muted">
          Gestão interna para agenda, habilidades e impressoras 3D.
        </p>
      </div>

      <nav aria-label="Navegação principal" className="space-y-2">
        {visibleNavigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              [
                "flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-[17px] font-semibold transition",
                isActive
                  ? "bg-primary-dark text-white shadow-soft"
                  : "text-text hover:bg-background hover:text-primary",
              ].join(" ")
            }
          >
            <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>{item.desktopLabel}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <AuthUserMenu />
      </div>
    </aside>
  );
}
