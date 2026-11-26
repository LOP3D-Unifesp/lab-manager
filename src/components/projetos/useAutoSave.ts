import { useEffect, useRef, useState } from "react";

import { createSaveQueue, type SaveStatus } from "../../lib/saveQueue";

// Gravação automática de um formulário aberto (ver createSaveQueue). Ao sair da tela, o que esperava é gravado.
export function useAutoSave(onError: (error: unknown) => void) {
  const [state, setState] = useState<{ status: SaveStatus; failed: boolean }>({ status: "idle", failed: false });
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const [queue] = useState(() => createSaveQueue({ onChange: setState, onError: (error) => onErrorRef.current(error) }));

  useEffect(() => () => void queue.flush(), [queue]);

  return { ...queue, ...state };
}
