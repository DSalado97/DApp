import { roll3d6 } from './checks';
import type { Rng } from './dice';
import { ATTRIBUTES, type AttributeId, type AttributeScores } from './types';

/** Tabla de cálculo de atributos: total de 3d6 → valor inicial (−2 a +4). */
export function attributeFromRoll(total: number): number {
  if (!Number.isInteger(total) || total < 3 || total > 18) throw new Error(`Total de 3d6 fuera de rango: ${total}`);
  if (total === 3) return -2;
  if (total <= 5) return -1;
  if (total <= 8) return 0;
  if (total <= 11) return 1;
  if (total <= 14) return 2;
  if (total <= 17) return 3;
  return 4;
}

export interface GeneratedAttributes {
  /** Tiradas de 3d6 (suma) en el orden de generación: Astucia, Comunicación, Constitución… Voluntad. */
  rolls: Record<AttributeId, number>;
  scores: AttributeScores;
}

/**
 * Ocho tiradas de 3d6, una por atributo, empezando por Astucia y siguiendo el orden alfabético de la hoja de
 * personaje hasta Voluntad. Después el jugador puede intercambiar dos valores (`swapAttributes`).
 */
export function generateAttributes(rng: Rng): GeneratedAttributes {
  const rolls = {} as Record<AttributeId, number>;
  const scores = {} as AttributeScores;
  for (const id of ATTRIBUTES) {
    rolls[id] = roll3d6(rng).sum;
    scores[id] = attributeFromRoll(rolls[id]);
  }
  return { rolls, scores };
}

/** Intercambia los valores de dos atributos (un único intercambio permitido tras generar). */
export function swapAttributes(scores: AttributeScores, a: AttributeId, b: AttributeId): AttributeScores {
  return { ...scores, [a]: scores[b], [b]: scores[a] };
}

/** Dinero inicial en piezas de plata: 50 + 3d6. */
export function startingSilver(rng: Rng): number {
  return 50 + roll3d6(rng).sum;
}
