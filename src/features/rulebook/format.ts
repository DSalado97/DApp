import type { Gear, Spell, Stunt, Weapon } from '@/content';
import { WEAPON_GROUP_LABELS } from '@/rules/types';

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export const formatPrice = (price: number | null) => (price === null ? '—' : `${price} mp`);

export const formatGearPrice = (price: Gear['price']) => `${price.amount} ${price.coin}`;

export function formatStuntCost(s: Pick<Stunt, 'cost' | 'variable' | 'maxCost'>): string {
  if (!s.variable) return `${s.cost} PP`;
  return s.maxCost ? `${s.cost}–${s.maxCost} PP` : `${s.cost}+ PP`;
}

export function formatSpellCost(cost: Spell['cost']): string {
  return cost.min === cost.max ? `${cost.max} PM` : `${cost.min}–${cost.max} PM`;
}

export const reloadLabel = (r: NonNullable<Weapon['reload']>) => ({ mayor: 'acción mayor', menor: 'acción menor', gratuita: 'acción gratuita' })[r];

export const groupLabel = (g: Weapon['group']) => WEAPON_GROUP_LABELS[g];

export const castingLabel = (c: Spell['casting']) => (c === 'un-minuto' ? '1 minuto' : 'acción mayor');

export const rankLabel = (r: 'aprendiz' | 'experto') => (r === 'aprendiz' ? 'Aprendiz' : 'Experto');

export const classLabel = (c: 'guerrero' | 'mago' | 'picaro') => ({ guerrero: 'Guerrero', mago: 'Mago', picaro: 'Pícaro' })[c];

export const raceLabel = (r: 'humano' | 'elfo' | 'enano') => ({ humano: 'Humano', elfo: 'Elfo', enano: 'Enano' })[r];
