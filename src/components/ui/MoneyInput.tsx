import type { InputHTMLAttributes } from "react";

import { maskCentsInput } from "../../lib/purchases";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "inputMode" | "type"> & {
  value: string;
  onChange: (value: string) => void;
};

// Campo de valor em reais com os centavos sempre à vista: cada dígito digitado entra pela direita
// (150 vira 1,50; 15059 vira 150,59). Pontos e vírgulas digitados são ignorados; colar um valor completo funciona.
export function MoneyInput({ onChange, value, ...rest }: MoneyInputProps) {
  return (
    <input
      {...rest}
      inputMode="numeric"
      placeholder={rest.placeholder ?? "0,00"}
      value={value}
      onChange={(event) => {
        // Colar (ou arrastar) um valor completo é respeitado; digitar entra pela direita, mesmo com o texto selecionado.
        const native = event.nativeEvent as InputEvent;
        const pasted = native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop";
        onChange(maskCentsInput(event.target.value, pasted));
      }}
    />
  );
}
