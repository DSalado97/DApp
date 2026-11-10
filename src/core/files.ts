export type SaveResult = 'saved' | 'shared' | 'downloaded' | 'cancelled';

type PickerWindow = Window & {
  showSaveFilePicker?: (opts: { suggestedName: string }) => Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
};

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/**
 * Guarda un archivo con File System Access API si existe (elegir carpeta); si no, Web Share API;
 * si no, descarga. Safari y Firefox no permiten elegir carpeta: el requisito se cumple solo donde el navegador lo ofrece.
 * Debe llamarse desde un gesto del usuario.
 */
export async function saveFile(filename: string, text: string, mime = 'application/json'): Promise<SaveResult> {
  const blob = new Blob([text], { type: mime });

  const w = window as PickerWindow;
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
      // otro fallo del selector: se prueba el siguiente método
    }
  }

  // iOS puede rechazar tipos desconocidos al compartir; se comparte como texto plano.
  const file = new File([text], filename, { type: 'text/plain' });
  if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
