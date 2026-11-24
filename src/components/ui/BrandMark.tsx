// Marca provisória do LO&P3D: o acrônimo em Dosis (com o "&" em magenta) e uma faixa com as 4 cores da paleta.
// Quando houver identidade profissional, é só trocar este arquivo.

// Cores exatas da marca (iguais nos dois temas; os tokens `primary`/`accent` mudam no modo escuro para dar contraste).
export const BRAND_COLORS = ["#0095d9", "#00a651", "#ec008c", "#ffcb05"] as const;

export function BrandStripe({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={["flex h-1.5 w-full overflow-hidden", className].join(" ")}>
      {BRAND_COLORS.map((color) => (
        <span key={color} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export function BrandMark({ className = "", text = "LO&P3D" }: { className?: string; text?: string }) {
  const parts = text.split("&");
  return (
    <span className={["font-display font-bold tracking-wide text-text", className].join(" ")}>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span className="text-accent">&amp;</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
