import { evaluateCheck, roll3d6, type CheckResult, type Roll3d6 } from './checks';
import { parseDice, rollExpr, type Rng } from './dice';
import type { AttributeId, AttributeScores, DiceExpr, RangeBands, WeaponGroupId, WeaponStats } from './types';

/** Atributo de la tirada de ataque según el grupo de armas. */
export const ATTACK_ATTRIBUTE: Record<WeaponGroupId, AttributeId> = {
  arcos: 'destreza',
  bastones: 'destreza',
  'hojas-ligeras': 'destreza',
  pelea: 'destreza',
  contundentes: 'fuerza',
  hachas: 'fuerza',
  'hojas-pesadas': 'fuerza',
  lanzas: 'fuerza',
};

/** Atributo que se suma al daño: Percepción en los Arcos, Fuerza en el resto. */
export function damageAttribute(group: WeaponGroupId): AttributeId {
  return group === 'arcos' ? 'percepcion' : 'fuerza';
}

export const UNTRAINED_ATTACK_PENALTY = -2;
export const LONG_RANGE_PENALTY = -2;
/** Daño del arma cuando la Fuerza es inferior a la mínima. */
export const UNDERSTRENGTH_DAMAGE: DiceExpr = { count: 1, sides: 6, bonus: -1 };

export const UNDERSTRENGTH_DAMAGE_TEXT = '1d6-1';

export function meetsMinStrength(weapon: Pick<WeaponStats, 'minStrength'>, fuerza: number): boolean {
  return weapon.minStrength === null || fuerza >= weapon.minStrength;
}

export interface AttackContext {
  attributes: AttributeScores;
  weapon: WeaponStats;
  /** ¿Entrenado en el grupo de armas? */
  trained: boolean;
  /** ¿Posee la concentración del grupo (p. ej. Destreza (Arcos))? */
  groupFocus?: boolean;
  /** Suma de modificadores: apuntar, carga, talentos, cobertura, alcance largo… */
  modifier?: number;
}

/** Suma que se añade a 3d6 en el ataque, con desglose. */
export function attackBonus(ctx: AttackContext): { attribute: AttributeId; total: number; untrainedPenalty: number } {
  const attribute = ATTACK_ATTRIBUTE[ctx.weapon.group];
  const untrainedPenalty = ctx.trained ? 0 : UNTRAINED_ATTACK_PENALTY;
  const total =
    ctx.attributes[attribute] + (ctx.groupFocus ? 2 : 0) + untrainedPenalty + (ctx.modifier ?? 0);
  return { attribute, total, untrainedPenalty };
}

export interface AttackResult extends CheckResult {
  hit: boolean;
}

/** Resuelve una tirada de ataque ya hecha contra una Defensa. */
export function resolveAttack(roll: Roll3d6, ctx: AttackContext, defenseValue: number): AttackResult {
  const attribute = ATTACK_ATTRIBUTE[ctx.weapon.group];
  const check = evaluateCheck(
    roll,
    {
      attribute: ctx.attributes[attribute],
      concentration: ctx.groupFocus ?? false,
      modifier: (ctx.trained ? 0 : UNTRAINED_ATTACK_PENALTY) + (ctx.modifier ?? 0),
    },
    defenseValue,
  );
  return { ...check, hit: check.success === true };
}

export function rollAttack(rng: Rng, ctx: AttackContext, defenseValue: number): AttackResult {
  return resolveAttack(roll3d6(rng), ctx, defenseValue);
}

// ── Alcance ──────────────────────────────────────────────────────────────────────────────────────────────────

export type RangeBand = 'corto' | 'largo' | 'fuera';

/** Sin entrenamiento, el alcance de los proyectiles se reduce a la mitad. */
export function effectiveRange(range: RangeBands, trained: boolean): RangeBands {
  return trained ? range : { short: Math.floor(range.short / 2), long: Math.floor(range.long / 2) };
}

export function rangeBand(range: RangeBands, distance: number, trained: boolean): RangeBand {
  const r = effectiveRange(range, trained);
  if (distance <= r.short) return 'corto';
  if (distance <= r.long) return 'largo';
  return 'fuera';
}

/** Modificador a la tirada de ataque por la banda de alcance (largo alcance: −2). */
export function rangeModifier(band: RangeBand): number {
  return band === 'largo' ? LONG_RANGE_PENALTY : 0;
}

// ── Daño ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface DamageContext {
  attributes: AttributeScores;
  weapon: WeaponStats;
  trained: boolean;
  /** Armadura del objetivo. */
  targetArmor: number;
  /** El daño penetrante ignora la armadura. */
  penetrating?: boolean;
  /** Atravesar armadura: la armadura del objetivo se reduce a la mitad (redondeando hacia abajo). */
  armorHalved?: boolean;
  /**
   * Daño adicional fijo (Golpe poderoso, Puñalada, objetos…). Se suma tras la reducción por falta de entrenamiento:
   * el manual no dice si esas bonificaciones se reducen también (ver RULES_GAPS).
   */
  extraDamage?: number;
}

export interface DamageBreakdown {
  /** Expresión de dados efectivamente usada. */
  expr: DiceExpr;
  underStrength: boolean;
  dice: number[];
  /** Dados + bonificación fija del arma. */
  weaponRoll: number;
  attribute: AttributeId;
  attributeValue: number;
  /** Tras sumar el atributo y, si no está entrenado, dividir a la mitad redondeando abajo. */
  beforeArmor: number;
  armor: number;
  /** Daño final aplicado a la Salud (nunca negativo). */
  total: number;
}

/** Armadura efectiva: 0 si el daño es penetrante; la mitad (abajo) con Atravesar armadura. */
export function effectiveArmor(armor: number, options: { penetrating?: boolean; armorHalved?: boolean } = {}): number {
  if (options.penetrating) return 0;
  return options.armorHalved ? Math.floor(armor / 2) : armor;
}

/**
 * Daño de un arma: dados + atributo (Fuerza, o Percepción en arcos); con Fuerza insuficiente los dados son 1d6−1;
 * sin entrenamiento se divide a la mitad (abajo) tras sumar el atributo; luego se resta la armadura.
 */
export function damageFromDice(rolled: { expr: DiceExpr; dice: number[]; weaponRoll: number; underStrength: boolean }, ctx: DamageContext): DamageBreakdown {
  const attribute = damageAttribute(ctx.weapon.group);
  const attributeValue = ctx.attributes[attribute];
  let subtotal = rolled.weaponRoll + attributeValue;
  if (!ctx.trained) subtotal = Math.floor(subtotal / 2);
  subtotal += ctx.extraDamage ?? 0;
  const armor = effectiveArmor(ctx.targetArmor, ctx);
  return {
    expr: rolled.expr,
    underStrength: rolled.underStrength,
    dice: rolled.dice,
    weaponRoll: rolled.weaponRoll,
    attribute,
    attributeValue,
    beforeArmor: subtotal,
    armor,
    total: Math.max(0, subtotal - armor),
  };
}

export function rollWeaponDamage(rng: Rng, ctx: DamageContext): DamageBreakdown {
  const underStrength = !meetsMinStrength(ctx.weapon, ctx.attributes.fuerza);
  const expr = underStrength ? UNDERSTRENGTH_DAMAGE : ctx.weapon.damage;
  const r = rollExpr(rng, expr);
  return damageFromDice({ expr, dice: r.dice, weaponRoll: r.total, underStrength }, ctx);
}

// ── Valores literales (criaturas y PNJ): nunca se recalculan ───────────────────────────────────────────────────

export interface LiteralAttack {
  /** Bonificación de ataque tal como se publica (p. ej. +5). */
  bonus: number;
  /** Daño publicado (p. ej. `1d6+4`). Ya incluye el atributo. */
  damage: string;
  /** Daño penetrante (ignora armadura). */
  penetrating?: boolean;
}

export function rollLiteralAttack(rng: Rng, attack: LiteralAttack, defenseValue: number, extraModifier = 0): AttackResult {
  const check = evaluateCheck(roll3d6(rng), { attribute: attack.bonus, modifier: extraModifier }, defenseValue);
  return { ...check, hit: check.success === true };
}

export function rollLiteralDamage(
  rng: Rng,
  attack: Pick<LiteralAttack, 'damage' | 'penetrating'>,
  targetArmor: number,
  options: { armorHalved?: boolean; extraDamage?: number } = {},
): { dice: number[]; rolled: number; armor: number; total: number } {
  const r = rollExpr(rng, parseDice(attack.damage));
  const armor = effectiveArmor(targetArmor, { penetrating: attack.penetrating ?? false, armorHalved: options.armorHalved ?? false });
  const rolled = r.total + (options.extraDamage ?? 0);
  return { dice: r.dice, rolled, armor, total: Math.max(0, rolled - armor) };
}
