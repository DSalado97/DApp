import type { DiceExpr } from './types';

/** Generador inyectable: devuelve un número en [0, 1). Los tests usan uno determinista. */
export type Rng = () => number;

/** RNG criptográfico del navegador/Node (sin `Math.random`, sin sesgo apreciable para d6). */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  return () => {
    globalThis.crypto.getRandomValues(buf);
    return (buf[0] ?? 0) / 0x1_0000_0000;
  };
}

/** Generador determinista (mulberry32) para tests y repeticiones. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG que devuelve una secuencia fija de caras de d6 (para comprobar casos concretos). */
export function sequenceRng(faces: readonly number[]): Rng {
  let i = 0;
  return () => {
    const face = faces[i++];
    if (face === undefined) throw new Error('sequenceRng: secuencia agotada');
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error(`sequenceRng: cara inválida ${face}`);
    return (face - 1) / 6 + 1 / 12;
  };
}

export function d6(rng: Rng): number {
  return Math.min(6, Math.floor(rng() * 6) + 1);
}

/** 1d3 según el manual: se tira 1d6 y se divide entre dos redondeando hacia arriba. */
export function d3(rng: Rng): number {
  return Math.ceil(d6(rng) / 2);
}

export interface RollResult {
  /** Caras individuales (para 1d3, el valor ya convertido). */
  dice: number[];
  bonus: number;
  total: number;
}

export function rollExpr(rng: Rng, expr: DiceExpr): RollResult {
  const dice: number[] = [];
  for (let i = 0; i < expr.count; i++) dice.push(expr.sides === 3 ? d3(rng) : d6(rng));
  return { dice, bonus: expr.bonus, total: dice.reduce((a, b) => a + b, 0) + expr.bonus };
}

const DICE_RE = /^\s*(\d+)\s*[dD]\s*(3|6)\s*(?:([+\-−–])\s*(\d+))?\s*$/;

/** Interpreta `2d6+3`, `1d6-1`, `1d3`, `3d6`. */
export function parseDice(text: string): DiceExpr {
  const m = DICE_RE.exec(text);
  if (!m) throw new Error(`Expresión de dados no válida: «${text}»`);
  const count = Number(m[1]);
  const sides = Number(m[2]) as 3 | 6;
  const sign = m[3] === '+' || m[3] === undefined ? 1 : -1;
  const bonus = m[4] === undefined ? 0 : sign * Number(m[4]);
  return { count, sides, bonus };
}

export function formatDice(expr: DiceExpr): string {
  const base = `${expr.count}d${expr.sides}`;
  if (expr.bonus === 0) return base;
  return expr.bonus > 0 ? `${base}+${expr.bonus}` : `${base}${expr.bonus}`;
}
