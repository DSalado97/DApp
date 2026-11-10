/**
 * Proezas (combate y magia). El catálogo de proezas vive en `content/`; aquí solo está la lógica de costes y gasto.
 */

export interface StuntDefinition {
  id: string;
  /** Coste base en PP (en las variables, el mínimo). */
  cost: number;
  /** Proezas de coste variable («1+», «1–3»): máximo de PP que pueden gastarse (infinito si no hay tope). */
  maxCost?: number;
  variable?: boolean;
  /** Las proezas se pueden usar una vez por asalto, salvo Hostigar. */
  oncePerRound: boolean;
  /** La tirada adicional que concede la proeza no genera PP (Ataque relámpago, Lanzamiento rápido…). */
  noExtraPoints?: boolean;
}

/** Cambio de coste: «por N PP en lugar de M» (`replaceCost`) o «reduce en N PP» (`delta`). */
export interface StuntCostModifier {
  stuntId: string;
  replaceCost?: number;
  delta?: number;
  /** Origen (clase, talento, objeto…), para mostrarlo. */
  source: string;
}

/** Coste efectivo: el menor de los reemplazos aplicables y, después, las reducciones. Nunca negativo. */
export function effectiveStuntCost(stunt: StuntDefinition, modifiers: readonly StuntCostModifier[]): number {
  const mine = modifiers.filter((m) => m.stuntId === stunt.id);
  const replacements = mine.flatMap((m) => (m.replaceCost === undefined ? [] : [m.replaceCost]));
  let cost = replacements.length ? Math.min(stunt.cost, ...replacements) : stunt.cost;
  for (const m of mine) cost += m.delta ?? 0;
  return Math.max(0, cost);
}

export interface StuntSelection {
  stuntId: string;
  /** Solo en proezas de coste variable: PP que se invierten. */
  spend?: number;
}

export interface SpendResult {
  ok: boolean;
  spent: number;
  remaining: number;
  errors: string[];
}

/**
 * Valida un gasto de PP: cada proeza una vez por asalto (salvo Hostigar, que se puede repetir mientras haya PP),
 * dentro de los PP generados y respetando el rango de las proezas de coste variable.
 */
export function validateStuntSpend(
  available: number,
  selections: readonly StuntSelection[],
  catalog: ReadonlyMap<string, StuntDefinition>,
  modifiers: readonly StuntCostModifier[] = [],
  alreadyUsedThisRound: ReadonlySet<string> = new Set(),
): SpendResult {
  const errors: string[] = [];
  let spent = 0;
  const seen = new Set(alreadyUsedThisRound);
  for (const sel of selections) {
    const def = catalog.get(sel.stuntId);
    if (!def) {
      errors.push(`Proeza desconocida: ${sel.stuntId}`);
      continue;
    }
    if (def.oncePerRound && seen.has(def.id)) errors.push(`${def.id}: solo una vez por asalto`);
    seen.add(def.id);
    let cost = effectiveStuntCost(def, modifiers);
    if (def.variable) {
      const spend = sel.spend ?? cost;
      const max = def.maxCost ?? Number.POSITIVE_INFINITY;
      if (spend < cost || spend > max) errors.push(`${def.id}: inversión fuera de rango`);
      cost = spend;
    }
    spent += cost;
  }
  if (spent > available) errors.push(`Se gastan ${spent} PP y solo hay ${available}`);
  return { ok: errors.length === 0, spent, remaining: available - spent, errors };
}
