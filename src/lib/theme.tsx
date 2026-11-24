import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "lab-manager:theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage indisponível (modo privado): usa o padrão.
  }
  return "system";
}

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveTheme(readPreference()));

  useEffect(() => {
    const apply = () => {
      const next = resolveTheme(preference);
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    apply();
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignora falha ao persistir
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  return context;
}
