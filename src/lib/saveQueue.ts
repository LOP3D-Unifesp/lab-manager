// Fila de gravações automáticas: uma por vez e na ordem pedida, para uma resposta atrasada não sobrescrever uma
// mudança mais nova. Cada campo tem uma chave; esperando para gravar, vale só o último pedido de cada uma.

export type SaveStatus = "idle" | "saving" | "saved";

type Action = () => Promise<unknown>;

export type SaveQueueEvents = {
  onChange: (state: { status: SaveStatus; failed: boolean }) => void;
  onError: (error: unknown) => void;
};

export function createSaveQueue({ onChange, onError }: SaveQueueEvents, delayMs = 700) {
  const waiting = new Map<string, { timer: ReturnType<typeof setTimeout>; action: Action }>();
  const failed = new Set<string>();
  let queue: Promise<void> = Promise.resolve();
  let running = 0;
  let saved = false;

  const notify = () => onChange({ status: running > 0 ? "saving" : saved && failed.size === 0 ? "saved" : "idle", failed: failed.size > 0 });

  function drop(key: string) {
    const entry = waiting.get(key);
    if (entry) clearTimeout(entry.timer);
    waiting.delete(key);
  }

  function now(key: string, action: Action) {
    drop(key);
    running += 1;
    notify();
    queue = queue.then(async () => {
      try {
        await action();
        saved = true;
        failed.delete(key);
      } catch (error) {
        failed.add(key);
        onError(error);
      } finally {
        running -= 1;
        notify();
      }
    });
    return queue;
  }

  // Para o que muda a cada tecla: grava quando a pessoa para por um instante.
  function later(key: string, action: Action) {
    drop(key);
    waiting.set(key, { action, timer: setTimeout(() => void now(key, action), delayMs) });
  }

  /** Grava já o que estava esperando e resolve quando a fila terminar. */
  function flush() {
    for (const [key, { action }] of [...waiting]) void now(key, action);
    return queue;
  }

  /** Descarta o que ainda não começou a ser gravado. */
  function cancel() {
    for (const key of [...waiting.keys()]) drop(key);
  }

  return { now, later, drop, flush, cancel, hasSaved: () => saved, hasFailed: () => failed.size > 0 };
}
