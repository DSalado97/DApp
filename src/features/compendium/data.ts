import { loadDmContent, type DmContent } from '@/content';
import { createSearchIndex, type SearchIndex } from '@/core/search';
import { buildDmDocs, buildPlayerDocs } from '@/core/searchDocs';

export interface Compendium {
  dm: DmContent;
  /** Solo contenido del DJ. */
  dmOnly: SearchIndex;
  /** Contenido del jugador y del DJ. */
  all: SearchIndex;
}

let cached: Promise<Compendium> | null = null;

/**
 * Carga el chunk del DJ (importación diferida) y construye sus índices. Solo se invoca desde pantallas protegidas
 * por el permiso `dm.compendium`; el resultado se conserva mientras dure la sesión.
 */
export function loadCompendium(): Promise<Compendium> {
  cached ??= loadDmContent()
    .then((dm) => {
      const dmDocs = buildDmDocs(dm);
      return { dm, dmOnly: createSearchIndex(dmDocs), all: createSearchIndex([...buildPlayerDocs(), ...dmDocs]) };
    })
    .catch((error: unknown) => {
      cached = null; // permite reintentar
      throw error;
    });
  return cached;
}
