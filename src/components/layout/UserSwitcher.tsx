import { User } from "lucide-react";

import { useCurrentProfile } from "../../lib/currentUser";

export function UserSwitcher() {
  const { currentProfileId, profiles, setCurrentProfileId } = useCurrentProfile();

  if (profiles.length === 0) {
    return null;
  }

  return (
    <label className="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm font-semibold text-muted">
      <span className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" aria-hidden="true" />
        Usuario atual
      </span>
      <select
        value={currentProfileId}
        onChange={(event) => setCurrentProfileId(event.target.value)}
        className="min-h-9 rounded-md border border-border bg-surface px-2 text-sm font-semibold text-text outline-none transition focus:border-primary"
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.full_name}
          </option>
        ))}
      </select>
    </label>
  );
}
