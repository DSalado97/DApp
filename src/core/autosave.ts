/**
 * Guardado automático con debounce y al pasar a segundo plano. `beforeunload` no es fiable en móvil:
 * se vacía la cola con `visibilitychange` (a oculto) y `pagehide`.
 */
export interface Autosaver<T> {
  schedule(value: T): void;
  /** Guarda ya lo pendiente (si hay). */
  flush(): Promise<void>;
  cancel(): void;
  dispose(): void;
}

export function createAutosaver<T>(save: (value: T) => Promise<void> | void, delayMs = 700): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;

  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const { value } = pending;
    pending = null;
    await save(value);
  };
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const onPageHide = () => void flush();
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);

  return {
    schedule(value) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
    dispose() {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    },
  };
}
