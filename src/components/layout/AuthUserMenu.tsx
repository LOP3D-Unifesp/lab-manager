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
    <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-text">
            {profile.full_name}
          </p>
          <p className="truncate text-sm font-semibold text-muted">
            {profile.email}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <StatusBadge label={getRoleLabel(profile.role)} variant="info" />
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/perfil"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-bold text-primary transition hover:bg-primary-soft"
          >
            Perfil
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
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
