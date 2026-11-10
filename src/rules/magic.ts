import { evaluateCheck, roll3d6, type CheckResult } from './checks';
import type { Rng } from './dice';
import type { ArmorId } from './types';

/** Maná adicional por conjuro según la armadura (tabla «Hechizos con armadura»). No es la penalización de la armadura. */
export const SPELL_ARMOR_IMPEDIMENT: Record<ArmorId, number> = {
  'cuero-ligera': 1,
  'cuero-pesada': 2,
  'malla-ligera': 3,
  'malla-pesada': 4,
  'coraza-ligera': 5,
  'coraza-pesada': 6,
};

export interface SpellCostInput {
  /** Coste básico elegido (en hechizos de coste variable, el PM que se paga: Sanar 1–3, Armadura de Roca 3–8). */
  baseCost: number;
  /** Armadura ordinaria que lleva puesta, si alguna. */
  armor?: ArmorId | null;
  /** Experto en la escuela del hechizo: −1 PM, mínimo 1. */
  schoolExpert?: boolean;
  /** Proeza Lanzamiento hábil: −1 PM, puede llegar a 0. */
  skilledCast?: boolean;
}

/**
 * Coste de Maná de un lanzamiento. Orden aplicado (ver RULES_GAPS): reducción por talento de escuela (mínimo 1) →
 * suma del impedimento de la armadura → reducción por Lanzamiento hábil (mínimo 0).
 */
export function spellManaCost(input: SpellCostInput): number {
  let cost = input.baseCost;
  if (input.schoolExpert) cost = Math.max(1, cost - 1);
  if (input.armor) cost += SPELL_ARMOR_IMPEDIMENT[input.armor];
  if (input.skilledCast) cost = Math.max(0, cost - 1);
  return cost;
}

/** Coste «básico» que consume el Escudo de Hechizos al anular un conjuro: sin reducciones por talentos o proezas. */
export function spellShieldDrain(baseCost: number): number {
  return baseCost;
}

export interface SpellCastInput {
  magia: number;
  /** Concentración de la escuela del hechizo (Creación, Entropía, Espiritual, Primordial). */
  schoolFocus: boolean;
  modifier?: number;
}

/** Tirada de hechizo = 3d6 + Magia + concentración, contra el NO del hechizo. Los PP salen de los dobles. */
export function castSpell(rng: Rng, input: SpellCastInput, spellTarget: number): CheckResult {
  return evaluateCheck(
    roll3d6(rng),
    { attribute: input.magia, concentration: input.schoolFocus, modifier: input.modifier ?? 0 },
    spellTarget,
  );
}

/** Lanza arcana: ataque a distancia de Magia (Lanza arcana), alcance 16 m, daño 1d6 + Magia, sin coste de Maná. */
export const ARCANE_LANCE = { rangeMeters: 16, damage: '1d6', bonusAttribute: 'magia' } as const;

/** Tirada de resistencia del objetivo contra la Potencia mágica: iguala o supera para resistir. */
export function resistsSpell(resistance: CheckResult, potency: number): boolean {
  return resistance.total >= potency;
}
