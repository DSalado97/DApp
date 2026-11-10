export interface StorageStatus {
  /** `null` si el navegador no ofrece la API. */
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
}

/** Pide almacenamiento persistente para que el navegador no borre los datos al liberar espacio. */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  let persisted: boolean | null = null;
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  try {
    if (navigator.storage?.persisted) persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      usageBytes = e.usage ?? null;
      quotaBytes = e.quota ?? null;
    }
  } catch {
    /* estado desconocido */
  }
  return { persisted, usageBytes, quotaBytes };
}
