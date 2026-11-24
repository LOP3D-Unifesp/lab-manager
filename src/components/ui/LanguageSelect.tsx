import { Languages } from "lucide-react";

import { LOCALES, type Locale, useI18n } from "../../i18n";

export function LanguageSelect({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={["relative inline-flex items-center", className].join(" ")}>
      <span className="sr-only">{t("language.label")}</span>
      <Languages className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden="true" />
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm font-semibold text-text outline-none transition focus:border-primary"
      >
        {LOCALES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
