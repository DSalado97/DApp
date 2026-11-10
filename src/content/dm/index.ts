/**
 * Contenido de audiencia «DJ». Se carga solo con `import('@/content/dm')` (chunk diferido) y nunca desde la ruta
 * de arranque ni desde el índice de búsqueda del jugador. No está cifrado (docs/SECURITY.md).
 */
export { CREATURES } from './creatures';
export { NPCS } from './npcs';
export { MAGIC_ITEMS } from './items';
export { DM_TABLES, CREATURE_FOCI } from './tables';
export { NARRATIVE_DM } from '../generated/narrative.dm';
