import { Monitor, Moon, Sun } from "lucide-react";

import { ThemePreference, useTheme } from "../../lib/theme";

const options: { value: ThemePreference; label: string; short: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Modo claro", short: "Claro", Icon: Sun },
  { value: "system", label: "Automático (segue o sistema)", short: "Auto", Icon: Monitor },
  { value: "dark", label: "Modo escuro", short: "Escuro", Icon: Moon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={["flex rounded-lg border border-border bg-background p-0.5", className].join(" ")}
    >
      {options.map(({ value, label, short, Icon }) => {
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
              "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-semibold transition",
              active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-text",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {short}
          </button>
        );
      })}
    </div>
  );
}
