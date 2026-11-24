import { createContext, Fragment, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { dictionaries, type MessageKey } from "./catalog";

export type Locale = "pt-BR" | "en" | "es";
export type { MessageKey };

type PluralBase<K> = K extends `${infer B}_other` ? B : never;
/** Chave de mensagem, ou a base de um par `_one`/`_other` (plural por `count`). */
export type TranslationKey = MessageKey | PluralBase<MessageKey>;

export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)", short: "PT" },
  { value: "en", label: "English", short: "EN" },
  { value: "es", label: "Español", short: "ES" },
];

const STORAGE_KEY = "lab-manager:locale";

export type TranslateVars = Record<string, string | number>;

export function detectLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "pt-BR" || stored === "en" || stored === "es") return stored;
  } catch {
    // localStorage indisponível: cai para o idioma do navegador.
  }
  const language = (typeof navigator !== "undefined" ? navigator.language : "pt-BR").toLowerCase();
  if (language.startsWith("es")) return "es";
  if (language.startsWith("en")) return "en";
  return "pt-BR";
}

// Idioma ativo fora do React (mensagens de erro em src/lib, formatadores).
let activeLocale: Locale = typeof window === "undefined" ? "pt-BR" : detectLocale();

export function getLocale(): Locale {
  return activeLocale;
}

export function translate(locale: Locale, key: TranslationKey, vars?: TranslateVars): string {
  const lookup = (l: Locale, k: string) => (dictionaries[l] as Record<string, string>)[k];
  let template = lookup(locale, key) ?? lookup("pt-BR", key) ?? key;
  if (vars && typeof vars.count === "number") {
    const plural = new Intl.PluralRules(locale).select(vars.count);
    const alt = lookup(locale, `${key}_${plural}`) ?? lookup(locale, `${key}_other`);
    if (alt) template = alt;
  }
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Tradução usando o idioma ativo; para código fora de componentes. */
export function t(key: TranslationKey, vars?: TranslateVars): string {
  return translate(activeLocale, key, vars);
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: TranslateVars) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    activeLocale = locale;
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    activeLocale = next;
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignora falha ao persistir
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n deve ser usado dentro de LanguageProvider.");
  return context;
}

/** Remonta a árvore ao trocar de idioma, para que textos gerados fora de hooks (src/lib) também atualizem. */
export function LocaleBoundary({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <Fragment key={locale}>{children}</Fragment>;
}

export function useT() {
  return useI18n().t;
}

/** Nome de um item de catálogo (tipo de equipamento, habilidade) no idioma ativo; cai para o nome original. */
export function localizedName(item: { name: string; name_en?: string | null; name_es?: string | null }, locale: Locale = activeLocale) {
  const translated = locale === "en" ? item.name_en : locale === "es" ? item.name_es : null;
  return translated?.trim() ? translated : item.name;
}

/** Formatadores que seguem o idioma ativo. */
export function formatDateTime(value: Date | string | number, options: Intl.DateTimeFormatOptions, locale: Locale = activeLocale) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale: Locale = activeLocale) {
  return new Intl.NumberFormat(locale, options).format(value);
}
