import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { Avatar } from "../ui/Avatar";
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
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} className="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight text-text">
            {profile.full_name}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold leading-tight text-muted">
            {profile.email}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <StatusBadge label={getRoleLabel(profile.role)} variant="info" />
        <Link
          to="/perfil"
          className="inline-flex h-8 items-center rounded-md px-2 text-sm font-bold text-primary transition hover:bg-primary-soft"
        >
          Meu perfil
        </Link>
        <button
          type="button"
          className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
          onClick={signOut}
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
