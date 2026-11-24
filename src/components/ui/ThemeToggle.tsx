import { Monitor, Moon, Sun } from "lucide-react";

import { useT, type MessageKey } from "../../i18n";
import { ThemePreference, useTheme } from "../../lib/theme";

const options: { value: ThemePreference; label: MessageKey; short: MessageKey; Icon: typeof Sun }[] = [
  { value: "light", label: "theme.lightTitle", short: "theme.light", Icon: Sun },
  { value: "system", label: "theme.systemTitle", short: "theme.system", Icon: Monitor },
  { value: "dark", label: "theme.darkTitle", short: "theme.dark", Icon: Moon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const t = useT();

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
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
            aria-label={t(label)}
            title={t(label)}
            onClick={() => setPreference(value)}
            className={[
              "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-semibold transition",
              active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-text",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(short)}
          </button>
        );
      })}
    </div>
  );
}
