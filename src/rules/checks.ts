import { d6, type Rng } from './dice';

/** Una concentración aplicable suma +2 a la tirada (y a la Potencia mágica). Solo se aplica una por tirada. */
export const CONCENTRATION_BONUS = 2;

/** Tirada de 3d6 con el último dado como dado dragón. */
export interface Roll3d6 {
  /** `[dado, dado, dragón]`. */
  dice: [number, number, number];
  dragon: number;
  sum: number;
  /** ¿Hay dobles en dos dados cualesquiera (incluido el dado dragón)? */
  doubles: boolean;
}

export function hasDoubles(dice: readonly [number, number, number]): boolean {
  const [a, b, c] = dice;
  return a === b || a === c || b === c;
}

export function makeRoll3d6(dice: [number, number, number]): Roll3d6 {
  return { dice, dragon: dice[2], sum: dice[0] + dice[1] + dice[2], doubles: hasDoubles(dice) };
}

export function roll3d6(rng: Rng): Roll3d6 {
  return makeRoll3d6([d6(rng), d6(rng), d6(rng)]);
}

export interface CheckInput {
  /** Valor del atributo. */
  attribute: number;
  /** ¿Se aplica una concentración? */
  concentration?: boolean;
  /** Modificadores de circunstancias, talentos, objetos… (suma algebraica). */
  modifier?: number;
}

export interface CheckResult extends Roll3d6 {
  attribute: number;
  concentrationBonus: number;
  modifier: number;
  /** 3d6 + atributo + concentración + modificadores. */
  total: number;
  /** NO o Defensa contra la que se compara; ausente en tiradas enfrentadas. */
  target?: number;
  /** Solo si hay objetivo: `total >= target`. */
  success?: boolean;
  /** PP generados: dado dragón si la tirada tiene éxito y hay dobles; en otro caso 0. */
  stuntPoints: number;
}

/**
 * Calcula el resultado de una tirada ya hecha. Con `target` se comprueba el éxito (igualar o superar) y los PP:
 * el dado dragón solo cuenta si la tirada tiene éxito.
 */
export function evaluateCheck(roll: Roll3d6, input: CheckInput, target?: number): CheckResult {
  const concentrationBonus = input.concentration ? CONCENTRATION_BONUS : 0;
  const modifier = input.modifier ?? 0;
  const total = roll.sum + input.attribute + concentrationBonus + modifier;
  const success = target === undefined ? undefined : total >= target;
  const result: CheckResult = {
    ...roll,
    attribute: input.attribute,
    concentrationBonus,
    modifier,
    total,
    stuntPoints: success && roll.doubles ? roll.dragon : 0,
  };
  if (target !== undefined) result.target = target;
  if (success !== undefined) result.success = success;
  return result;
}

export function attributeCheck(rng: Rng, input: CheckInput, target?: number): CheckResult {
  return evaluateCheck(roll3d6(rng), input, target);
}

export type OpposedWinner = 'a' | 'b' | 'tie';

/**
 * Tirada enfrentada: gana el resultado más alto; el empate se resuelve por el dado dragón más alto y, si persiste,
 * por el valor de atributo más alto. Si todo coincide, el empate se mantiene (el DJ decide).
 */
export function opposedWinner(a: CheckResult, b: CheckResult): OpposedWinner {
  if (a.total !== b.total) return a.total > b.total ? 'a' : 'b';
  if (a.dragon !== b.dragon) return a.dragon > b.dragon ? 'a' : 'b';
  if (a.attribute !== b.attribute) return a.attribute > b.attribute ? 'a' : 'b';
  return 'tie';
}

/** Tirada enfrentada completa. Ninguno de los dos genera PP en una tirada enfrentada de ataque (Desarmar). */
export function opposedCheck(
  rng: Rng,
  a: CheckInput,
  b: CheckInput,
): { a: CheckResult; b: CheckResult; winner: OpposedWinner } {
  const ra = attributeCheck(rng, a);
  const rb = attributeCheck(rng, b);
  return { a: ra, b: rb, winner: opposedWinner(ra, rb) };
}

export interface AdvancedProgress {
  threshold: number;
  /** Suma de los dados dragón (más bonificaciones) de las tiradas superadas. */
  progress: number;
  rolls: number;
  complete: boolean;
}

export function startAdvanced(threshold: number): AdvancedProgress {
  return { threshold, progress: 0, rolls: 0, complete: threshold <= 0 };
}

/**
 * Añade una tirada a una tirada avanzada: solo las superadas suman su dado dragón (los fallos no suman).
 * `dragonBonus` modela Erudición (Experto): +1 por dado dragón en Astucia (Investigación).
 */
export function advanceProgress(state: AdvancedProgress, roll: CheckResult, dragonBonus = 0): AdvancedProgress {
  if (roll.success === undefined) throw new Error('advanceProgress necesita una tirada con objetivo (NO)');
  const gained = roll.success ? roll.dragon + dragonBonus : 0;
  const progress = state.progress + gained;
  return { threshold: state.threshold, progress, rolls: state.rolls + 1, complete: progress >= state.threshold };
}

/** Atajo para jugar una tirada avanzada completa de forma automática (útil para pruebas y simulaciones). */
export function runAdvanced(
  rng: Rng,
  input: CheckInput,
  target: number,
  threshold: number,
  options: { dragonBonus?: number; maxRolls?: number } = {},
): AdvancedProgress {
  const max = options.maxRolls ?? 100;
  let state = startAdvanced(threshold);
  while (!state.complete && state.rolls < max) {
    state = advanceProgress(state, attributeCheck(rng, input, target), options.dragonBonus ?? 0);
  }
  return state;
}
