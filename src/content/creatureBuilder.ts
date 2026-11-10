import { ATTRIBUTES, type AttributeId } from '@/rules/types';
import type { Creature } from './schemas';

/** Atributos en el orden de publicación: Astucia / Comunicación / Constitución / Destreza / Fuerza / Magia / Percepción / Voluntad. */
export type AttributeTuple = readonly [number, number, number, number, number, number, number, number];

export function attributesFromTuple(tuple: AttributeTuple): Record<AttributeId, number> {
  const out = {} as Record<AttributeId, number>;
  ATTRIBUTES.forEach((id, i) => {
    out[id] = tuple[i] as number;
  });
  return out;
}

export interface CreatureInput {
  id: string;
  name: string;
  aliases?: string[];
  kind: Creature['kind'];
  audience: Creature['audience'];
  source: Creature['source'];
  summary: string;
  attributes: AttributeTuple;
  focuses?: Creature['focuses'];
  combat: Creature['combat'];
  /** Ataques como `[nombre, bonificación, daño, penetrante?]`. */
  attacks?: ReadonlyArray<readonly [string, number, string] | readonly [string, number, string, boolean]>;
  ranged?: Record<string, { short: number; long: number }>;
  favoredStunts?: string[];
  talents?: Creature['talents'];
  weaponGroups?: Creature['weaponGroups'];
  equipment?: string;
  abilities?: Creature['abilities'];
  classLevel?: Creature['classLevel'];
  noncombatant?: boolean;
  notes?: string;
}

/** Construye un registro de criatura/PNJ con valores literales, tal como se publican (nunca se recalculan). */
export function creature(input: CreatureInput) {
  return {
    id: input.id,
    name: input.name,
    aliases: input.aliases ?? [],
    kind: input.kind,
    audience: input.audience,
    source: input.source,
    summary: input.summary,
    attributes: attributesFromTuple(input.attributes),
    focuses: input.focuses ?? {},
    combat: input.combat,
    attacks: (input.attacks ?? []).map(([name, bonus, damage, penetrating]) => ({
      name,
      bonus,
      damage,
      penetrating: penetrating ?? false,
      ...(input.ranged?.[name] ? { range: input.ranged[name] } : {}),
    })),
    favoredStunts: input.favoredStunts ?? [],
    talents: input.talents ?? [],
    weaponGroups: input.weaponGroups ?? [],
    ...(input.equipment ? { equipment: input.equipment } : {}),
    abilities: input.abilities ?? [],
    ...(input.classLevel ? { classLevel: input.classLevel } : {}),
    noncombatant: input.noncombatant ?? false,
    ...(input.notes ? { notes: input.notes } : {}),
  };
}
