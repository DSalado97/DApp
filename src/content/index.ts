/**
 * Punto de entrada del contenido para la aplicación.
 *
 * - Lo exportado aquí es contenido de audiencia «jugador» (más la narrativa de jugador).
 * - El contenido del DJ se obtiene solo con `loadDmContent()`, que carga un chunk diferido: nada de él entra en el
 *   arranque ni en el índice de búsqueda del jugador. No se cifra (ver docs/SECURITY.md).
 */
export * from './player';
export { NARRATIVE_PLAYER } from './generated/narrative.player';
export type * from './schemas';
export { CHAPTER_TITLES } from './narrativeClassification';

export const loadDmContent = () => import('./dm');
export type DmContent = Awaited<ReturnType<typeof loadDmContent>>;
