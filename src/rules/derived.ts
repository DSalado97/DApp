import { CONCENTRATION_BONUS } from './checks';
import { d6, type Rng } from './dice';
import type { ArmorCategory, ClassId, RaceId, TalentRank } from './types';

/** Velocidad base por raza (m). */
export const BASE_SPEED: Record<RaceId, number> = { enano: 8, humano: 10, elfo: 12 };

/** Salud inicial: base de clase + Constitución + 1d6. */
export const BASE_HEALTH: Record<ClassId, number> = { guerrero: 30, picaro: 25, mago: 20 };

/** Umbrales de experiencia acumulada para cada nivel (1 a 5). */
export const XP_THRESHOLDS = [0, 2000, 4500, 7500, 11000] as const;
export const MAX_LEVEL = 5;

export function levelForXp(xp: number): number {
  let level = 1;
  XP_THRESHOLDS.forEach((threshold, i) => {
    if (xp >= threshold) level = i + 1;
  });
  return level;
}

/** PE que faltan para el siguiente nivel; `null` en el nivel máximo de la Caja Básica. */
export function xpToNextLevel(xp: number): number | null {
  const level = levelForXp(xp);
  const next = XP_THRESHOLDS[level];
  return next === undefined ? null : next - xp;
}

/** Defensa = 10 + Destreza + bonificación de escudo. */
export function defense(destreza: number, shieldBonus = 0): number {
  return 10 + destreza + shieldBonus;
}

/** Sin Combate con arma y escudo, el escudo da como máximo +1. */
export function effectiveShieldBonus(shieldBonus: number, hasShieldTalent: boolean): number {
  return hasShieldTalent ? shieldBonus : Math.min(shieldBonus, 1);
}

/**
 * ¿Está el personaje entrenado en este tipo de armadura? Entrenamiento con armaduras: Aprendiz cubre cuero y malla;
 * Experto, también las corazas. Sin el talento, ninguna.
 */
export function trainedInArmor(category: ArmorCategory, rank: TalentRank | null): boolean {
  if (rank === null) return false;
  return category === 'coraza' ? rank === 'experto' : true;
}

export interface ArmorEffectInput {
  destreza: number;
  /** Impedimento de la armadura como número positivo (0 a 5). */
  impediment: number;
  trained: boolean;
  /** Aptitud de pícaro «Armadura de pícaro»: ignora la penalización de las armaduras de cuero. */
  ignoredByRogue?: boolean;
}

/**
 * Penalización de armadura: con entrenamiento afecta a la Velocidad; sin él, a la Destreza y, por tanto, también
 * a la Velocidad (y a la Defensa, que depende de la Destreza).
 */
export function armorEffect(input: ArmorEffectInput): { destreza: number; speedPenalty: number } {
  if (input.ignoredByRogue || input.impediment === 0) return { destreza: input.destreza, speedPenalty: 0 };
  return input.trained
    ? { destreza: input.destreza, speedPenalty: input.impediment }
    : { destreza: input.destreza - input.impediment, speedPenalty: 0 };
}

/** Velocidad = base de raza + Destreza (efectiva) − penalización de armadura entrenada. */
export function speed(race: RaceId, effectiveDestreza: number, speedPenalty = 0): number {
  return BASE_SPEED[race] + effectiveDestreza - speedPenalty;
}

export function initialHealth(classId: ClassId, constitucion: number, d6Roll: number): number {
  return BASE_HEALTH[classId] + constitucion + d6Roll;
}

/** Maná inicial del mago: 10 + Magia + 1d6. */
export function initialMana(magia: number, d6Roll: number): number {
  return 10 + magia + d6Roll;
}

/** Salud ganada al subir de nivel: 1d6 + Constitución (el manual no fija mínimo; ver RULES_GAPS). */
export function healthPerLevel(constitucion: number, d6Roll: number): number {
  return d6Roll + constitucion;
}

/** Maná ganado al subir de nivel: Magia + 1d6. */
export function manaPerLevel(magia: number, d6Roll: number): number {
  return magia + d6Roll;
}

/** Potencia mágica = 10 + Magia + concentración de escuela (+2) si la hay. */
export function spellPotency(magia: number, schoolFocus: boolean, bonus = 0): number {
  return 10 + magia + (schoolFocus ? CONCENTRATION_BONUS : 0) + bonus;
}

/** Atributo que sube al alcanzar un nivel: primario en niveles pares, secundario en impares. */
export function levelUpAttributeKind(newLevel: number): 'primario' | 'secundario' {
  return newLevel % 2 === 0 ? 'primario' : 'secundario';
}

// ── Salud, muerte y recuperación ─────────────────────────────────────────────────────────────────────────────

/** La Salud nunca baja de 0 (no existe Salud negativa). */
export function applyDamage(health: number, damage: number): number {
  return Math.max(0, health - Math.max(0, damage));
}

/** La curación nunca supera la Salud máxima. */
export function applyHealing(health: number, max: number, amount: number): number {
  return Math.min(max, health + Math.max(0, amount));
}

/** Un PJ a 0 de Salud muere tras `2 + Constitución` asaltos sin curación. */
export function dyingRounds(constitucion: number): number {
  return Math.max(0, 2 + constitucion);
}

/** El moribundo muere al comienzo de su turno en el último asalto. `roundsSinceDown`: asaltos transcurridos desde que cayó. */
export function diesAtTurnStart(constitucion: number, roundsSinceDown: number): boolean {
  return roundsSinceDown >= dyingRounds(constitucion);
}

/** Curación de primeros auxilios (NO 11, Astucia (Curación)): dado dragón + Astucia del sanador. */
export function firstAidHealing(dragon: number, astucia: number): number {
  return dragon + astucia;
}

/**
 * Quirurgía (Experto): el doble de la suma del dado dragón y la Astucia, como lo enuncia el Manual del Narrador
 * (Hermana Arda). El Manual del Jugador lo redacta de forma ambigua y el compendio da otra fórmula (RULES_ERRATA).
 */
export function surgeonHealing(dragon: number, astucia: number): number {
  return 2 * (dragon + astucia);
}

/** Respiro de cinco minutos tras un encuentro: 5 + Constitución + nivel. No aplica si se terminó a 0 de Salud. */
export function breatherHealing(constitucion: number, level: number): number {
  return 5 + constitucion + level;
}

/** Descanso de al menos seis horas de sueño: 10 + Constitución + nivel. */
export function sleepHealing(constitucion: number, level: number): number {
  return 10 + constitucion + level;
}

export function canTakeBreather(healthAtEndOfEncounter: number): boolean {
  return healthAtEndOfEncounter > 0;
}

/** Maná recuperado por hora completa de descanso: 1d6 + Magia. Ocho horas seguidas lo recuperan todo. */
export function manaRecoveryPerHour(rng: Rng, magia: number): number {
  return d6(rng) + magia;
}

export const FULL_MANA_REST_HOURS = 8;

/** Maná recuperado tras `hours` horas de descanso (las ocho horas ininterrumpidas devuelven todo el maná). */
export function recoverMana(rng: Rng, params: { current: number; max: number; magia: number; hours: number; uninterrupted?: boolean }): number {
  if (params.hours >= FULL_MANA_REST_HOURS && params.uninterrupted) return params.max;
  let mana = params.current;
  for (let h = 0; h < Math.floor(params.hours); h++) mana = Math.min(params.max, mana + manaRecoveryPerHour(rng, params.magia));
  return mana;
}

/** Movimiento: carga = hasta la mitad de la Velocidad (redondeando abajo); correr = hasta el doble. */
export const chargeDistance = (speedValue: number) => Math.floor(speedValue / 2);
export const runDistance = (speedValue: number) => speedValue * 2;
