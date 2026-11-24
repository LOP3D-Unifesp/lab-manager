import { useT } from "../../i18n";
import { useMemo, useState } from "react";

import type { PublicProfile } from "../../lib/domain";
import { Avatar } from "../ui/Avatar";

type MembersEditorProps = {
  profiles: PublicProfile[];
  value: string[];
  onChange: (profileIds: string[]) => void;
  disabled?: boolean;
};

export function MembersEditor({ disabled, onChange, profiles, value }: MembersEditorProps) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const selecionados = useMemo(() => new Set(value), [value]);
  const visiveis = profiles.filter((profile) =>
    profile.full_name.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  function alternar(profileId: string) {
    onChange(selecionados.has(profileId) ? value.filter((id) => id !== profileId) : [...value, profileId]);
  }

  return (
    <div className="grid gap-3">
      <input
        className="min-h-11 rounded-lg border border-border bg-background px-4 text-base outline-none transition focus:border-primary"
        placeholder={t("members.search")}
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
      />
      <p className="text-sm text-muted">{t("members.selected", { count: value.length })}</p>
      <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
        {visiveis.map((profile) => {
          const selecionado = selecionados.has(profile.id);
          return (
            <label
              key={profile.id}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-base font-semibold transition",
                selecionado
                  ? "border-primary bg-primary-soft text-primary-dark"
                  : "border-border bg-surface text-text hover:border-primary",
              ].join(" ")}
            >
              <input
                checked={selecionado}
                className="h-4 w-4 accent-primary"
                disabled={disabled}
                type="checkbox"
                onChange={() => alternar(profile.id)}
              />
              <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} className="h-8 w-8" />
              <span className="min-w-0 truncate">{profile.full_name}</span>
            </label>
          );
        })}
        {visiveis.length === 0 ? <p className="text-base text-muted">{t("members.none")}</p> : null}
      </div>
    </div>
  );
}
