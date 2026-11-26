import type { KeyboardEvent } from "react";

type TabsProps<T extends string> = {
  /** Prefixo dos ids: cada aba é `<idBase>-tab-<id>` e controla o painel `<idBase>-panel-<id>`. */
  idBase: string;
  label: string;
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
};

// Abas com o teclado: as setas trocam de aba e o Tab segue para o conteúdo.
export function Tabs<T extends string>({ idBase, label, onChange, tabs, value }: TabsProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = tabs.findIndex((tab) => tab.id === value);
    const next = tabs[(current + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.id);
    document.getElementById(`${idBase}-tab-${next.id}`)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="mt-2 flex gap-1 overflow-x-auto overflow-y-hidden" onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${idBase}-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          aria-controls={`${idBase}-panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          className={[
            "whitespace-nowrap border-b-2 px-2 py-2.5 text-sm font-semibold transition sm:px-3 sm:text-base",
            value === tab.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-text",
          ].join(" ")}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
