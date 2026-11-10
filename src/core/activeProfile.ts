const KEY = 'dads.activeProfile';

/** El último perfil activo va en localStorage; todo lo demás, en IndexedDB. */
export function getLastActiveProfileId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastActiveProfileId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, id);
  } catch {
    /* almacenamiento bloqueado: se recupera el primer perfil al arrancar */
  }
}
