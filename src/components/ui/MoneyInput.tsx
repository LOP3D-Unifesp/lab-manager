import type { InputHTMLAttributes } from "react";

import { maskMoneyInput } from "../../lib/purchases";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "inputMode" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /** Casas decimais aceitas (2 para valores pagos; o valor unitário aceita até 4). */
  decimals?: number;
};

// O ponto digitado (ou colado como "1234.56") vira vírgula: em teclados ABNT2 o ponto do teclado numérico
// costuma ser o separador decimal. Os pontos que a própria máscara põe (milhar) nunca passam por aqui.
export function normalizeTypedDot(previous: string, next: string) {
  if (next.length === previous.length + 1) {
    let at = 0;
    while (at < previous.length && previous[at] === next[at]) at += 1;
    if (next[at] === "." && next.slice(0, at) + next.slice(at + 1) === previous) {
      return `${next.slice(0, at)},${next.slice(at + 1)}`;
    }
    return next;
  }
  // Colar "1234.56" (ponto seguido de 1 ou 2 dígitos no fim) é decimal; "1.234" (3 dígitos) é milhar.
  if (Math.abs(next.length - previous.length) > 1 && !next.includes(",") && /^\s*(R\$\s*)?\d+\.\d{1,2}\s*$/.test(next)) {
    return next.replace(".", ",");
  }
  return next;
}

// Campo de valor em reais: formata enquanto a pessoa digita (1234,5 vira 1.234,5).
export function MoneyInput({ decimals = 2, onChange, value, ...rest }: MoneyInputProps) {
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(maskMoneyInput(normalizeTypedDot(value, event.target.value), decimals))}
    />
  );
}
