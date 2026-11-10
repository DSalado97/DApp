/**
 * Tipos de dominio del motor de reglas. `rules/` no importa nada del proyecto: los datos (`content/`) satisfacen
 * estos tipos de forma estructural y los identificadores son estables entre compendio, fichas y combate.
 */

export const ATTRIBUTES = [
  'astucia',
  'comunicacion',
  'constitucion',
  'destreza',
  'fuerza',
  'magia',
  'percepcion',
  'voluntad',
] as const;
export type AttributeId = (typeof ATTRIBUTES)[number];
export type AttributeScores = Record<AttributeId, number>;

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  astucia: 'Astucia',
  comunicacion: 'Comunicación',
  constitucion: 'Constitución',
  destreza: 'Destreza',
  fuerza: 'Fuerza',
  magia: 'Magia',
  percepcion: 'Percepción',
  voluntad: 'Voluntad',
};

export const WEAPON_GROUPS = [
  'arcos',
  'contundentes',
  'bastones',
  'hachas',
  'hojas-ligeras',
  'hojas-pesadas',
  'lanzas',
  'pelea',
] as const;
export type WeaponGroupId = (typeof WEAPON_GROUPS)[number];

/** Nombre de la concentración de atributo que coincide con cada grupo de armas. */
export const WEAPON_GROUP_FOCUS: Record<WeaponGroupId, string> = {
  arcos: 'Arcos',
  contundentes: 'Armas contundentes',
  bastones: 'Bastones',
  hachas: 'Hachas',
  'hojas-ligeras': 'Hojas ligeras',
  'hojas-pesadas': 'Hojas pesadas',
  lanzas: 'Lanzas',
  pelea: 'Pelea',
};

export const WEAPON_GROUP_LABELS: Record<WeaponGroupId, string> = {
  arcos: 'Arcos',
  contundentes: 'Armas contundentes',
  bastones: 'Bastones',
  hachas: 'Hachas',
  'hojas-ligeras': 'Hojas ligeras',
  'hojas-pesadas': 'Hojas pesadas',
  lanzas: 'Lanzas',
  pelea: 'Pelea',
};

export const RACES = ['humano', 'elfo', 'enano'] as const;
export type RaceId = (typeof RACES)[number];

export const CLASSES = ['guerrero', 'mago', 'picaro'] as const;
export type ClassId = (typeof CLASSES)[number];

export const SCHOOLS = ['creacion', 'entropia', 'espiritual', 'primordial'] as const;
export type SchoolId = (typeof SCHOOLS)[number];

export const SCHOOL_LABELS: Record<SchoolId, string> = {
  creacion: 'Creación',
  entropia: 'Entropía',
  espiritual: 'Espiritual',
  primordial: 'Primordial',
};

export const ARMOR_IDS = [
  'cuero-ligera',
  'cuero-pesada',
  'malla-ligera',
  'malla-pesada',
  'coraza-ligera',
  'coraza-pesada',
] as const;
export type ArmorId = (typeof ARMOR_IDS)[number];
export type ArmorCategory = 'cuero' | 'malla' | 'coraza';

export type TalentRank = 'aprendiz' | 'experto';

/** Expresión de dados `NdM+B`. `sides` 3 significa «tirar 1d6 y dividir entre dos redondeando hacia arriba». */
export interface DiceExpr {
  count: number;
  sides: 3 | 6;
  bonus: number;
}

export type ReloadAction = 'mayor' | 'menor' | 'gratuita';

export interface RangeBands {
  short: number;
  long: number;
}

/** Lo mínimo que el motor necesita saber de un arma. */
export interface WeaponStats {
  group: WeaponGroupId;
  damage: DiceExpr;
  /** Fuerza mínima; `null` si no exige ninguna. */
  minStrength: number | null;
  /** Alcance corto/largo en metros; ausente en armas cuerpo a cuerpo. */
  range?: RangeBands;
}
