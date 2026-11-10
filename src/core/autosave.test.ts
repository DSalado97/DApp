import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaver } from './autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('guardado automático', () => {
  it('agrupa cambios con debounce y guarda el último valor', async () => {
    const save = vi.fn();
    const a = createAutosaver<string>(save, 500);
    a.schedule('a');
    await vi.advanceTimersByTimeAsync(300);
    a.schedule('ab');
    await vi.advanceTimersByTimeAsync(300);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('ab');
    a.dispose();
  });

  it('guarda de inmediato al pasar a segundo plano (visibilitychange) y en pagehide', async () => {
    const save = vi.fn();
    const a = createAutosaver<string>(save, 10_000);
    a.schedule('pendiente');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledWith('pendiente');

    a.schedule('otro');
    window.dispatchEvent(new Event('pagehide'));
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenLastCalledWith('otro');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    a.dispose();
  });

  it('flush sin nada pendiente no guarda, y cancel descarta', async () => {
    const save = vi.fn();
    const a = createAutosaver<number>(save, 100);
    await a.flush();
    a.schedule(1);
    a.cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).not.toHaveBeenCalled();
    a.dispose();
  });

  it('dispose deja de escuchar', async () => {
    const save = vi.fn();
    const a = createAutosaver<number>(save, 100_000);
    a.schedule(1);
    a.dispose();
    window.dispatchEvent(new Event('pagehide'));
    await vi.advanceTimersByTimeAsync(0);
    expect(save).not.toHaveBeenCalled();
  });
});
