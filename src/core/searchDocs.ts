import {
  ANIMALS,
  ARMORS,
  BACKGROUNDS,
  CLASSES_DATA,
  CONDITIONS,
  FOCI,
  GEAR,
  NARRATIVE_PLAYER,
  PLAYER_TABLES,
  SHIELDS,
  SPELLS,
  STUNTS,
  TALENTS,
  WEAPONS,
  type Creature,
  type DmContent,
  type NarrativeSection,
} from '@/content';
import { ATTRIBUTE_LABELS, ATTRIBUTES, SCHOOL_LABELS, WEAPON_GROUP_LABELS } from '@/rules/types';
import type { SearchDoc } from './search';

/** Quita marcas de Markdown para indexar el texto plano. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\|/g, ' ')
    .replace(/^[-: ]+$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CATEGORY = {
  weapon: 'Armas',
  armor: 'Armaduras',
  shield: 'Escudos',
  gear: 'Equipo',
  stunt: 'Proezas',
  talent: 'Talentos',
  class: 'Clases',
  background: 'Trasfondos',
  spell: 'Hechizos',
  condition: 'Estados',
  table: 'Tablas',
  focus: 'Concentraciones',
  creature: 'Criaturas',
  npc: 'PNJ',
  item: 'Objetos mágicos',
} as const;

const doc = (kind: string, id: string, title: string, aliases: string[], category: string, text: string, audience: 'player' | 'dm'): SearchDoc => ({
  id: `${kind}:${id}`,
  kind,
  title,
  aliases,
  category,
  text,
  audience,
});

const creatureText = (c: Creature) =>
  [
    c.summary,
    ...Object.entries(c.focuses).flatMap(([attr, names]) => (names ?? []).map((n) => `${ATTRIBUTE_LABELS[attr as keyof typeof ATTRIBUTE_LABELS]} ${n}`)),
    ...c.attacks.map((a) => a.name),
    ...c.abilities.flatMap((a) => [a.name, a.text]),
    c.equipment ?? '',
    c.notes ?? '',
  ].join(' ');

function narrativeDocs(sections: readonly NarrativeSection[]): SearchDoc[] {
  return sections.map((s) => doc('narrative', s.id, `${s.id}. ${s.title}`, [], s.chapter, plainText(s.body), s.audience));
}

/**
 * Documentos de búsqueda de audiencia «jugador». Se construyen únicamente con contenido de jugador: el DJ no está
 * aquí (un test lo comprueba), y el contenido del DJ no se carga para generar este índice.
 */
export function buildPlayerDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const w of WEAPONS) docs.push(doc('weapon', w.id, w.name, w.aliases, CATEGORY.weapon, `${WEAPON_GROUP_LABELS[w.group]} daño ${w.damage}. ${w.description}`, w.audience));
  for (const a of ARMORS) docs.push(doc('armor', a.id, a.name, a.aliases, CATEGORY.armor, `Armadura ${a.armorValue}. ${a.description}`, a.audience));
  for (const s of SHIELDS) docs.push(doc('shield', s.id, s.name, s.aliases, CATEGORY.shield, `Defensa +${s.defenseBonus}. ${s.description}`, s.audience));
  for (const g of GEAR) docs.push(doc('gear', g.id, g.name, g.aliases, CATEGORY.gear, g.description ?? '', g.audience));
  for (const s of STUNTS) docs.push(doc('stunt', s.id, s.name, s.aliases, CATEGORY.stunt, `${s.kind === 'combate' ? 'Proeza de combate' : 'Proeza mágica'} ${s.cost} PP. ${s.effect}`, s.audience));
  for (const t of TALENTS) docs.push(doc('talent', t.id, t.name, t.aliases, CATEGORY.talent, `${t.summary} Aprendiz: ${t.apprentice} Experto: ${t.expert} Requisitos: ${t.requirements.text}`, t.audience));
  for (const c of CLASSES_DATA) docs.push(doc('class', c.id, c.name, c.aliases, CATEGORY.class, `${c.summary} ${c.levels.flatMap((l) => l.features.map((f) => `${f.name} ${f.text}`)).join(' ')}`, c.audience));
  for (const b of BACKGROUNDS) docs.push(doc('background', b.id, b.name, b.aliases, CATEGORY.background, `${b.summary} ${b.drawback ?? ''}`, b.audience));
  for (const s of SPELLS) docs.push(doc('spell', s.id, s.name, s.aliases, CATEGORY.spell, `${SCHOOL_LABELS[s.school]} ${s.type}. ${s.effect}`, s.audience));
  for (const c of CONDITIONS) docs.push(doc('condition', c.id, c.name, c.aliases, CATEGORY.condition, c.summary, c.audience));
  for (const t of PLAYER_TABLES) docs.push(doc('table', t.id, t.name, [], CATEGORY.table, `${t.note ?? ''} ${t.rows.map((r) => r.join(' ')).join(' ')}`, t.audience));
  for (const a of ANIMALS) docs.push(doc('animal', a.id, a.name, a.aliases, CATEGORY.creature, creatureText(a), a.audience));
  for (const attr of ATTRIBUTES) {
    const names = FOCI.filter((f) => f.attribute === attr).map((f) => f.name);
    docs.push(doc('focus', attr, `Concentraciones de ${ATTRIBUTE_LABELS[attr]}`, [`${ATTRIBUTE_LABELS[attr]} concentraciones`], CATEGORY.focus, names.join(' '), 'player'));
  }
  docs.push(...narrativeDocs(NARRATIVE_PLAYER));
  return docs;
}

/** Documentos de búsqueda de audiencia «DJ» (solo con permiso `dm.compendium`). */
export function buildDmDocs(dm: DmContent): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const c of dm.CREATURES) docs.push(doc('creature', c.id, c.name, c.aliases, CATEGORY.creature, creatureText(c), c.audience));
  for (const n of dm.NPCS) docs.push(doc('npc', n.id, n.name, n.aliases, CATEGORY.npc, creatureText(n), n.audience));
  for (const i of dm.MAGIC_ITEMS) docs.push(doc('item', i.id, i.name, i.aliases, CATEGORY.item, `${i.effect} ${i.restriction ?? ''}`, i.audience));
  for (const t of dm.DM_TABLES) docs.push(doc('table', t.id, t.name, [], CATEGORY.table, `${t.note ?? ''} ${t.rows.map((r) => r.join(' ')).join(' ')}`, t.audience));
  docs.push(...narrativeDocs(dm.NARRATIVE_DM));
  return docs;
}
