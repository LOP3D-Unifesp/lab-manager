import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import { useAuth } from "../../lib/auth";
import { Avatar } from "../ui/Avatar";
import { StatusBadge } from "../ui/StatusBadge";

export function AuthUserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { profile, signOut } = useAuth();
  const t = useT();

  if (!profile) {
    return null;
  }

  const signOutButton = (
    <button
      type="button"
      className={[
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark",
        collapsed ? "" : "ml-auto",
      ].join(" ")}
      onClick={signOut}
      title={t("common.signOut")}
      aria-label={t("common.signOut")}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  // Menu encolhido: a foto leva ao perfil e o botão de sair fica embaixo.
  if (collapsed) {
    return (
      <div className="grid justify-items-center gap-2">
        <Link to="/perfil" aria-label={t("account.profile")} title={`${profile.full_name} · ${t("account.profile")}`} className="rounded-full">
          <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} className="h-9 w-9" />
        </Link>
        {signOutButton}
      </div>
    );
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
        <StatusBadge label={t(profile.role === "coordinator" ? "role.coordinator" : "role.researcher")} variant="info" />
        <Link
          to="/perfil"
          className="inline-flex h-8 items-center rounded-md px-2 text-sm font-bold text-primary transition hover:bg-primary-soft"
        >
          {t("account.profile")}
        </Link>
        {signOutButton}
      </div>
    </div>
  );
}
