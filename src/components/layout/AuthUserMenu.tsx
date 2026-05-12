import { LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { StatusBadge } from "../ui/StatusBadge";

function getRoleLabel(role?: string) {
  return role === "coordinator" ? "Coordenador" : "Pesquisador";
}

export function AuthUserMenu() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return null;
  }

  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-background p-2.5 sm:gap-3 sm:p-3">
      <div className="flex min-w-0 items-center gap-2.5 sm:items-start sm:gap-3">
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary sm:h-9 sm:w-9">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight text-text sm:text-base">
            {profile.full_name}
          </p>
          <p className="truncate text-[13px] font-semibold leading-tight text-muted sm:text-sm">
            {profile.email}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
        <StatusBadge label={getRoleLabel(profile.role)} variant="info" />
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/perfil"
            className="inline-flex h-8 items-center rounded-md px-2.5 text-sm font-bold text-primary transition hover:bg-primary-soft sm:h-9 sm:px-3"
          >
            Perfil
          </Link>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark sm:h-9 sm:w-9"
            onClick={signOut}
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
