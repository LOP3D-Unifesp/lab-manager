import { LogOut, User } from "lucide-react";

import { useAuth } from "../../lib/auth";

export function UserSwitcher() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm font-semibold text-muted">
      <span className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" aria-hidden="true" />
        {user.first_name} {user.last_name}
      </span>
      <button
        onClick={logout}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-sm font-semibold text-text outline-none transition hover:bg-surface/80 focus:border-primary"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </div>
  );
}
