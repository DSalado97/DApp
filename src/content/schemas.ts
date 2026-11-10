import { z } from 'zod';
import { ARMOR_IDS, ATTRIBUTES, CLASSES, RACES, SCHOOLS, WEAPON_GROUPS } from '@/rules/types';

/** Identificadores estables en kebab-case ASCII, compartidos entre compendio, fichas y combate. */
export const IdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id en kebab-case ASCII');

export const AudienceSchema = z.enum(['player', 'dm']);
export type Audience = z.infer<typeof AudienceSchema>;

/** Libro de origen: el PDF que respalda el dato. `page` es la página impresa, cuando se ha comprobado. */
export const SourceSchema = z.object({
  book: z.enum(['jugador', 'narrador']),
  section: z.string().min(1),
  page: z.number().int().positive().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const AttributeIdSchema = z.enum(ATTRIBUTES);
export const WeaponGroupSchema = z.enum(WEAPON_GROUPS);
export const RaceSchema = z.enum(RACES);
export const ClassSchema = z.enum(CLASSES);
export const SchoolSchema = z.enum(SCHOOLS);
export const ArmorIdSchema = z.enum(ARMOR_IDS);

const DiceTextSchema = z.string().regex(/^\d+d[36]([+-]\d+)?$/, 'expresión de dados, p. ej. 2d6+3');

const base = {
  id: IdSchema,
  name: z.string().min(1),
  /** Nombres alternativos (p. ej. términos del compendio) usados como alias de búsqueda. */
  aliases: z.array(z.string().min(1)).default([]),
  source: SourceSchema,
  audience: AudienceSchema,
};

// ── Concentraciones ──────────────────────────────────────────────────────────────────────────────────────────

export const FocusSchema = z.object({
  attribute: AttributeIdSchema,
  name: z.string().min(1),
  /** `general`: de personaje; `weapon`: grupo de armas; `school`: escuela de magia; `creature`: solo criaturas. */
  kind: z.enum(['general', 'weapon', 'school', 'creature']),
  source: SourceSchema,
  audience: AudienceSchema,
});
export type Focus = z.infer<typeof FocusSchema>;

// ── Armas, armaduras, escudos y equipo ───────────────────────────────────────────────────────────────────────

export const WeaponSchema = z.object({
  ...base,
  group: WeaponGroupSchema,
  damage: DiceTextSchema,
  minStrength: z.number().int().nullable(),
  /** Precio en piezas de plata; `null` si no se compra (Puño, Arma improvisada). */
  price: z.number().nullable(),
  range: z.object({ short: z.number().positive(), long: z.number().positive() }).optional(),
  reload: z.enum(['mayor', 'menor', 'gratuita']).optional(),
  twoHanded: z.boolean().default(false),
  thrown: z.boolean().default(false),
  description: z.string().min(1),
});
export type Weapon = z.infer<typeof WeaponSchema>;

export const ArmorSchema = z.object({
  ...base,
  category: z.enum(['cuero', 'malla', 'coraza']),
  armorValue: z.number().int().nonnegative(),
  /** Impedimento (penalización) como número positivo. */
  impediment: z.number().int().nonnegative(),
  /** Maná adicional por conjuro (tabla «Hechizos con armadura»). */
  spellManaExtra: z.number().int().positive(),
  price: z.number().positive(),
  description: z.string().min(1),
});
export type Armor = z.infer<typeof ArmorSchema>;

export const ShieldSchema = z.object({
  ...base,
  defenseBonus: z.number().int().positive(),
  price: z.number().positive(),
  description: z.string().min(1),
});
export type Shield = z.infer<typeof ShieldSchema>;

export const PriceSchema = z.object({ amount: z.number().positive(), coin: z.enum(['mp', 'mc']) });

export const GearSchema = z.object({
  ...base,
  category: z.enum(['aventurero', 'servicio', 'animal-vehiculo']),
  price: PriceSchema,
  description: z.string().optional(),
});
export type Gear = z.infer<typeof GearSchema>;

// ── Proezas ──────────────────────────────────────────────────────────────────────────────────────────────────

export const StuntSchema = z.object({
  ...base,
  kind: z.enum(['combate', 'magia']),
  cost: z.number().int().positive(),
  /** Proezas de coste variable («1+», «1–3»). */
  variable: z.boolean().default(false),
  maxCost: z.number().int().positive().optional(),
  oncePerRound: z.boolean(),
  /** La tirada adicional que concede no genera PP aunque salgan dobles. */
  noExtraPoints: z.boolean().default(false),
  effect: z.string().min(1),
});
export type Stunt = z.infer<typeof StuntSchema>;

// ── Talentos ─────────────────────────────────────────────────────────────────────────────────────────────────

const FocusRefSchema = z.object({ attribute: AttributeIdSchema, name: z.string() });

export const TalentRequirementSchema = z.object({
  /** Texto del manual. */
  text: z.string().min(1),
  attributes: z.array(z.object({ attribute: AttributeIdSchema, min: z.number().int() })).default([]),
  /** Debe poseer alguna de estas concentraciones. */
  focusAnyOf: z.array(FocusRefSchema).default([]),
  /** Debe estar entrenado en alguno de estos grupos de armas. */
  trainedGroupAnyOf: z.array(WeaponGroupSchema).default([]),
});

export const TalentStuntCostSchema = z.object({
  rank: z.enum(['aprendiz', 'experto']),
  stuntId: IdSchema,
  cost: z.number().int().nonnegative(),
  /** Condición del manual (p. ej. «con un arma cuerpo a cuerpo a dos manos»). */
  when: z.string().optional(),
});

export const TalentSchema = z.object({
  ...base,
  classes: z.array(ClassSchema).min(1),
  requirements: TalentRequirementSchema,
  summary: z.string().min(1),
  apprentice: z.string().min(1),
  expert: z.string().min(1),
  /** Rebajas de PP que concede el talento, legibles por el motor. */
  stuntCosts: z.array(TalentStuntCostSchema).default([]),
  /** Experto: −1 PM a los hechizos de esta escuela (mínimo 1) y un hechizo adicional. */
  schoolExpertise: SchoolSchema.optional(),
});
export type Talent = z.infer<typeof TalentSchema>;

// ── Clases ───────────────────────────────────────────────────────────────────────────────────────────────────

export const ClassFeatureSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  text: z.string().min(1),
  /** Rebajas de PP que concede la aptitud. */
  stuntCosts: z.array(z.object({ stuntId: IdSchema, cost: z.number().int().nonnegative() })).default([]),
});

export const ClassLevelSchema = z.object({
  level: z.number().int().min(1).max(5),
  features: z.array(ClassFeatureSchema).min(1),
});

export const ClassDefinitionSchema = z.object({
  ...base,
  summary: z.string().min(1),
  primaryAttributes: z.array(AttributeIdSchema).length(3),
  secondaryAttributes: z.array(AttributeIdSchema).length(5),
  baseHealth: z.number().int().positive(),
  /** Mana inicial: solo el mago (10 + Magia + 1d6). */
  startingMana: z.object({ base: z.number().int(), perLevelAttribute: AttributeIdSchema }).optional(),
  weaponGroups: z.object({
    fixed: z.array(WeaponGroupSchema),
    /** El jugador elige `count` de `from`. */
    choose: z.object({ count: z.number().int().positive(), from: z.array(WeaponGroupSchema) }).optional(),
  }),
  /** Equipo inicial (texto del manual). */
  startingEquipment: z.array(z.string().min(1)).min(1),
  levels: z.array(ClassLevelSchema).length(5),
});
export type ClassDefinition = z.infer<typeof ClassDefinitionSchema>;

// ── Trasfondos ───────────────────────────────────────────────────────────────────────────────────────────────

export const BenefitSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('attribute'), attribute: AttributeIdSchema, value: z.number().int().default(1) }),
  z.object({ kind: z.literal('focus'), attribute: AttributeIdSchema, focus: z.string().min(1) }),
  z.object({ kind: z.literal('language'), language: z.string().min(1), skill: z.enum(['hablar', 'hablar-y-leer', 'leer']) }),
  z.object({ kind: z.literal('weaponGroup'), group: WeaponGroupSchema }),
]);
export type Benefit = z.infer<typeof BenefitSchema>;

export const BenefitRowSchema = z.object({
  /** Intervalo de 2d6 (ambos incluidos). */
  min: z.number().int().min(2).max(12),
  max: z.number().int().min(2).max(12),
  benefit: BenefitSchema,
  /** Texto del manual para mostrar. */
  label: z.string().min(1),
});

export const BackgroundSchema = z.object({
  ...base,
  races: z.array(RaceSchema).min(1),
  summary: z.string().min(1),
  attributeBonus: z.object({ attribute: AttributeIdSchema, value: z.number().int() }),
  /** El jugador elige una de estas concentraciones. */
  focusChoices: z.array(z.object({ attribute: AttributeIdSchema, focus: z.string().min(1) })).min(2),
  languages: z.array(z.object({ language: z.string().min(1), skill: z.enum(['hablar', 'hablar-y-leer', 'leer']) })).min(1),
  classes: z.array(ClassSchema).min(1),
  /** Número de tiradas en la tabla de beneficios (siempre dos). Si se repite un resultado, se vuelve a tirar. */
  benefitRolls: z.number().int().positive(),
  /** Tablas 2d6; `appliesTo` indica las razas a las que sirve (una por raza elegible, o una única para todas). */
  benefitTables: z.array(z.object({ appliesTo: z.array(RaceSchema).min(1), rows: z.array(BenefitRowSchema).min(1) })).min(1),
  /** Inconveniente narrativo declarado por el manual (Apóstata). */
  drawback: z.string().optional(),
});
export type Background = z.infer<typeof BackgroundSchema>;

// ── Hechizos ─────────────────────────────────────────────────────────────────────────────────────────────────

export const SpellSchema = z.object({
  ...base,
  school: SchoolSchema,
  type: z.enum(['ofensivo', 'defensivo', 'mejora', 'utilidad']),
  cost: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() }),
  /** Tiempo de preparación. */
  casting: z.enum(['accion-mayor', 'un-minuto']),
  /** NO de la tirada de hechizo. */
  target: z.number().int(),
  /** Tirada de resistencia del objetivo contra la Potencia mágica; `null` si no hay. */
  resistance: z.object({ attribute: AttributeIdSchema, focus: z.string().optional() }).nullable(),
  range: z.string().optional(),
  duration: z.string().optional(),
  effect: z.string().min(1),
});
export type Spell = z.infer<typeof SpellSchema>;

// ── Estados y tablas ─────────────────────────────────────────────────────────────────────────────────────────

export const ConditionSchema = z.object({
  ...base,
  summary: z.string().min(1),
  /** Efectos con cifras en las fuentes. */
  mechanics: z
    .object({
      defenseOverride: z.number().int().optional(),
      meleeAttackBonusAgainst: z.number().int().optional(),
      noActions: z.boolean().optional(),
      noMajorActions: z.boolean().optional(),
    })
    .default({}),
});
export type Condition = z.infer<typeof ConditionSchema>;

export const TableSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  columns: z.array(z.string().min(1)).min(2),
  rows: z.array(z.array(z.string())).min(1),
  note: z.string().optional(),
  source: SourceSchema,
  audience: AudienceSchema,
});
export type GameTable = z.infer<typeof TableSchema>;

// ── Criaturas y PNJ (valores literales: nunca se recalculan) ──────────────────────────────────────────────────

const ConcentrationNamesSchema = z.partialRecord(AttributeIdSchema, z.array(z.string().min(1)));

export const CreatureAttackSchema = z.object({
  name: z.string().min(1),
  /** Bonificación de ataque publicada, p. ej. 5 para «+5». */
  bonus: z.number().int(),
  /** Daño publicado, p. ej. `1d6+4`. */
  damage: DiceTextSchema,
  penetrating: z.boolean().default(false),
  /** Alcance corto/largo si es un ataque a distancia. */
  range: z.object({ short: z.number().positive(), long: z.number().positive() }).optional(),
});

export const CreatureAbilitySchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  text: z.string().min(1),
  /** Coste en PP si es una proeza especial. */
  stuntCost: z.number().int().positive().optional(),
});

export const CreatureSchema = z.object({
  ...base,
  /** `creature`: bestiario; `npc`: personaje con nombre o tipo humano del manual. */
  kind: z.enum(['creature', 'npc']),
  summary: z.string().min(1),
  /** Los atributos de criatura pueden superar 4 (Oso negro: 6). */
  attributes: z.record(AttributeIdSchema, z.number().int()),
  /** Concentraciones por atributo: catálogo abierto (Mordisco, Garras, Cornada, Tacto, Gusto…). */
  focuses: ConcentrationNamesSchema.default({}),
  /** Valores de combate publicados; `null` si el manual no los da (PNJ sin bloque de combate). */
  combat: z
    .object({
      speed: z.number().int().nonnegative(),
      flyingSpeed: z.number().int().positive().optional(),
      health: z.number().int().positive(),
      defense: z.number().int(),
      defenseWithShield: z.number().int().optional(),
      armor: z.number().int().nonnegative(),
    })
    .nullable(),
  attacks: z.array(CreatureAttackSchema).default([]),
  favoredStunts: z.array(z.string().min(1)).default([]),
  talents: z.array(z.object({ talent: IdSchema, rank: z.enum(['aprendiz', 'experto']) })).default([]),
  weaponGroups: z.array(WeaponGroupSchema).default([]),
  equipment: z.string().optional(),
  abilities: z.array(CreatureAbilitySchema).default([]),
  /** PNJ con clase y nivel (Eshara, Tarl Dale). */
  classLevel: z.object({ class: ClassSchema, level: z.number().int().positive() }).optional(),
  noncombatant: z.boolean().default(false),
  notes: z.string().optional(),
});
export type Creature = z.infer<typeof CreatureSchema>;

// ── Objetos mágicos ──────────────────────────────────────────────────────────────────────────────────────────

export const MagicItemSchema = z.object({
  ...base,
  kind: z.enum(['temporal', 'permanente']),
  effect: z.string().min(1),
  restriction: z.string().optional(),
  /** Rebajas de PP legibles por el motor. */
  stuntCosts: z.array(z.object({ stuntId: IdSchema, cost: z.number().int().nonnegative() })).default([]),
});
export type MagicItem = z.infer<typeof MagicItemSchema>;

// ── Narrativa (texto del compendio dividido por encabezados) ─────────────────────────────────────────────────────

export const NarrativeSectionSchema = z.object({
  /** Número de sección del compendio: «2.3», «7.1», «11.4»… */
  id: z.string().regex(/^\d+(\.\d+)?[a-z]?$/),
  title: z.string().min(1),
  chapter: z.string().min(1),
  /** Texto en Markdown del compendio. */
  body: z.string().min(1),
  audience: AudienceSchema,
  /** Libro que respalda la clasificación de la sección. */
  origin: z.enum(['compendio', 'jugador', 'narrador']),
});
export type NarrativeSection = z.infer<typeof NarrativeSectionSchema>;

/** Valida un catálogo completo y comprueba que no haya ids duplicados. */
export function parseCatalog<S extends z.ZodType<{ id: string }>>(schema: S, data: readonly unknown[], label: string): z.infer<S>[] {
  const parsed = z.array(schema).parse(data) as z.infer<S>[];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (seen.has(item.id)) throw new Error(`${label}: id duplicado «${item.id}»`);
    seen.add(item.id);
  }
  return parsed;
}
