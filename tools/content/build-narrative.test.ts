// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTION_RULES } from '../../src/content/narrativeClassification.ts';
import { buildSections, parseSections } from './build-narrative.ts';

const sample = [
  '# DRAGON AGE RPG — COMPENDIO',
  '',
  '## Nota sobre este documento',
  'Meta que no debe aparecer.',
  '',
  '# 1. CONCEPTOS BÁSICOS DEL JUEGO',
  '',
  '## 1.1. Qué es Dragon Age',
  'Texto uno.',
  '',
  '### Subtítulo',
  'Más texto.',
  '',
  '---',
  '',
  '# 13. GLOSARIO PRÁCTICO',
  '',
  '| Término | Definición breve |',
  '|---|---|',
  '| Aravel | Carromato. |',
  '| Vhenallin | Amigo del pueblo. |',
  '',
  '---',
  '',
  '# ÍNDICE TEMÁTICO DE CONSULTA',
  '- índice',
].join('\n');

describe('parseSections', () => {
  it('divide por encabezados, salta la portada y el índice y conserva los subtítulos', () => {
    const s = parseSections(sample);
    expect(s.map((x) => x.id)).toEqual(['1.1', '13']);
    expect(s[0]).toMatchObject({ title: 'Qué es Dragon Age', chapter: 'Conceptos básicos del juego' });
    expect(s[0]!.body).toContain('### Subtítulo');
    expect(s[0]!.body).not.toContain('---');
    expect(s.some((x) => x.body.includes('Meta que no debe aparecer'))).toBe(false);
    expect(s.some((x) => x.body.includes('índice'))).toBe(false);
  });

  it('un capítulo con subsecciones no genera sección propia', () => {
    const ids = parseSections('# 3. CREACIÓN\n\nintro\n\n## 3.1. Pasos\ntexto\n\n## 3.2. Atributos\ntexto').map((x) => x.id);
    expect(ids).toEqual(['3.1', '3.2']);
  });

  it('un encabezado de primer nivel desconocido es un error', () => {
    expect(() => parseSections('# 1. UNO\n\n## 1.1. A\nx\n\n# EXTRA\n')).toThrow(/sin clasificar/);
  });
});

describe('buildSections', () => {
  it('falla si hay una sección sin clasificar', () => {
    expect(() => buildSections('# 1. UNO\n\n## 1.9. Nueva\ntexto')).toThrow(/sin clasificar: 1\.9/);
  });

  it('falla si una clasificación ya no tiene sección', () => {
    expect(() => buildSections('# 1. UNO\n\n## 1.1. A\ntexto')).toThrow(/Clasificaciones sin sección/);
  });
});

/** Si el compendio está disponible, el texto generado versionado debe coincidir con su clasificación actual. */
const compendium = resolve(process.cwd(), '..', 'Manuales', 'Set 1', 'Dragon_Age_Compendio_Caja_Basica.md');
describe.skipIf(!existsSync(compendium))('contra el compendio real', () => {
  const { sections, excluded } = buildSections(readFileSync(compendium, 'utf8'));

  it('clasifica todas las secciones del compendio', () => {
    const ids = new Set([...sections.map((s) => s.id.replace(/b$/, '')), ...excluded.map((e) => e.id)]);
    expect([...ids].sort()).toEqual(Object.keys(SECTION_RULES).sort());
  });

  it('la sección 7 se reparte como fija el plan', () => {
    const aud = (id: string) => sections.find((s) => s.id === id)?.audience;
    for (const id of ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.10', '7.11']) expect(aud(id), id).toBe('player');
    for (const id of ['7.9', '7.12', '7.14']) expect(aud(id), id).toBe('dm');
  });

  it('el archivo generado y versionado está al día', async () => {
    const player = await import('../../src/content/generated/narrative.player.ts');
    const dm = await import('../../src/content/generated/narrative.dm.ts');
    const strip = (list: typeof sections) => list.map(({ id, title, chapter, body, audience, origin }) => ({ id, title, chapter, body, audience, origin }));
    expect(player.NARRATIVE_PLAYER).toEqual(strip(sections.filter((s) => s.audience === 'player')));
    expect(dm.NARRATIVE_DM).toEqual(strip(sections.filter((s) => s.audience === 'dm')));
  });
});
