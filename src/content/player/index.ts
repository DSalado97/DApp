/**
 * Contenido de audiencia «jugador». Este módulo NUNCA importa de `../dm`: el índice de búsqueda del jugador se
 * construye solo con lo que sale de aquí (y con la narrativa `generated/narrative.player`).
 */
export { FOCI, focusKey } from './foci';
export { WEAPONS, ARMORS, SHIELDS, GEAR } from './equipment';
export { STUNTS } from './stunts';
export { TALENTS } from './talents';
export { CLASSES_DATA, LEVEL_TABLE } from './classes';
export { BACKGROUNDS } from './backgrounds';
export { SPELLS, SUGGESTED_SPELL_SETS } from './spells';
export { CONDITIONS, FREE_EFFECT_ID, FREE_EFFECT_LABEL } from './conditions';
export { PLAYER_TABLES } from './tables';
export { ANIMALS } from './animals';
