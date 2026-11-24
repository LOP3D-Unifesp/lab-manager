import { Monitor, Moon, Sun } from "lucide-react";

import { ThemePreference, useTheme } from "../../lib/theme";

const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Modo claro", Icon: Sun },
  { value: "system", label: "Automático (sistema)", Icon: Monitor },
  { value: "dark", label: "Modo escuro", Icon: Moon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={["inline-flex rounded-lg border border-border bg-background p-0.5", className].join(" ")}
    >
      {options.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={[
              "inline-flex h-9 w-9 items-center justify-center rounded-md transition",
              active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-text",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
