/**
 * Divide el compendio por encabezados y genera el texto narrativo de la aplicación (Fase 3).
 *
 *   npm run content:narrative [-- ruta/al/compendio.md]
 *
 * Entrada: el compendio (fuera del repositorio; por defecto `../Manuales/Set 1/Dragon_Age_Compendio_Caja_Basica.md`).
 * Salida: `src/content/generated/narrative.player.ts` y `narrative.dm.ts` (se versionan; los manuales no).
 * La clasificación de cada sección es explícita (`src/content/narrativeClassification.ts`): si aparece una sección
 * sin clasificar, o una clasificada que ya no existe, el script falla.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHAPTER_TITLES,
  GLOSSARY_DM_ROWS,
  SECTION_RULES,
  SKIPPED_HEADINGS,
  type SectionRule,
} from '../../src/content/narrativeClassification.ts';

interface Section {
  id: string;
  title: string;
  chapter: string;
  body: string;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const input = resolve(root, process.argv[2] ?? '../Manuales/Set 1/Dragon_Age_Compendio_Caja_Basica.md');
const outDir = resolve(root, 'src', 'content', 'generated');

const CHAPTER_RE = /^# (\d+)\.\s+(.+)$/;
const SECTION_RE = /^## (\d+\.\d+)\.\s+(.+)$/;

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Parte el compendio en secciones `##` (y capítulos sin subsecciones, como el glosario). */
export function parseSections(markdown: string): Section[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections: Section[] = [];
  let chapterNumber = '';
  let chapterTitle = '';
  let current: { id: string; title: string; chapter: string; lines: string[] } | null = null;
  let skipping = true; // hasta el primer capítulo numerado se salta la portada

  const flush = () => {
    if (!current) return;
    const body = current.lines.join('\n').replace(/\n-{3,}\s*$/m, '').trim();
    if (body) sections.push({ id: current.id, title: current.title, chapter: current.chapter, body });
    current = null;
  };

  for (const line of lines) {
    const chapter = CHAPTER_RE.exec(line);
    if (chapter) {
      flush();
      skipping = false;
      chapterNumber = chapter[1] as string;
      chapterTitle = CHAPTER_TITLES[chapterNumber] ?? sentence((chapter[2] as string).trim());
      // Un capítulo sin subsecciones se trata como una sola sección; si las tiene, su cuerpo previo se descarta.
      current = { id: chapterNumber, title: chapterTitle, chapter: chapterTitle, lines: [] };
      continue;
    }
    if (/^# /.test(line)) {
      // Encabezado de primer nivel sin número: portada (antes del capítulo 1) o índice final. Cualquier otro es un error.
      flush();
      if (chapterNumber && !SKIPPED_HEADINGS.some((h) => line.includes(h))) throw new Error(`Encabezado sin clasificar: ${line}`);
      skipping = true;
      continue;
    }
    if (skipping) continue;
    const section = SECTION_RE.exec(line);
    if (section) {
      flush();
      current = { id: section[1] as string, title: (section[2] as string).trim(), chapter: chapterTitle, lines: [] };
      continue;
    }
    current?.lines.push(line);
  }
  flush();
  // Los capítulos con subsecciones dejan una entrada «N» solo con la introducción: se conserva solo si no tiene hijas.
  const withChildren = new Set(sections.filter((s) => s.id.includes('.')).map((s) => s.id.split('.')[0]));
  return sections.filter((s) => s.id.includes('.') || !withChildren.has(s.id));
}

function blocks(body: string): string[] {
  return body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
}

function withCorrections(body: string, rule: SectionRule): string {
  if (!rule.corrections?.length) return body;
  const notes = rule.corrections.map((c) => `> **Corrección verificada en el manual:** ${c}`).join('\n>\n');
  return `${body}\n\n${notes}`;
}

export interface BuiltSection {
  id: string;
  title: string;
  chapter: string;
  body: string;
  audience: 'player' | 'dm';
  origin: 'compendio' | 'jugador' | 'narrador';
}

export function buildSections(markdown: string): { sections: BuiltSection[]; excluded: { id: string; reason: string }[] } {
  const parsed = parseSections(markdown);
  const seen = new Set(parsed.map((s) => s.id));
  const missing = parsed.filter((s) => !SECTION_RULES[s.id]).map((s) => s.id);
  const stale = Object.keys(SECTION_RULES).filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`Secciones sin clasificar: ${missing.join(', ')}`);
  if (stale.length) throw new Error(`Clasificaciones sin sección en el compendio: ${stale.join(', ')}`);

  const out: BuiltSection[] = [];
  const excluded: { id: string; reason: string }[] = [];
  for (const s of parsed) {
    const rule = SECTION_RULES[s.id] as SectionRule;
    if (rule.audience === 'excluded') {
      excluded.push({ id: s.id, reason: rule.reason ?? '' });
      continue;
    }
    const origin = rule.origin;
    if (rule.splitPlayerBlocks) {
      const all = blocks(s.body);
      const player = all.filter((_, i) => rule.splitPlayerBlocks?.includes(i));
      const dm = all.filter((_, i) => !rule.splitPlayerBlocks?.includes(i));
      if (player.length) out.push({ id: s.id, title: 'Combate montado', chapter: s.chapter, body: player.join('\n\n'), audience: 'player', origin: 'jugador' });
      if (dm.length) out.push({ id: `${s.id}b`, title: 'Salud de montura y criaturas voladoras', chapter: s.chapter, body: dm.join('\n\n'), audience: 'dm', origin: 'narrador' });
      continue;
    }
    if (s.id === '13') {
      const lines = s.body.split('\n');
      const dmRows = lines.filter((l) => GLOSSARY_DM_ROWS.some((re) => re.test(l)));
      const playerLines = lines.filter((l) => !dmRows.includes(l));
      out.push({ id: s.id, title: s.title, chapter: s.chapter, body: withCorrections(playerLines.join('\n').trim(), rule), audience: 'player', origin });
      if (dmRows.length) {
        const header = lines.filter((l) => /^\|\s*Término/.test(l) || /^\|[-:| ]+\|$/.test(l)).slice(0, 2);
        out.push({ id: '13b', title: 'Glosario de la aventura', chapter: s.chapter, body: [...header, ...dmRows].join('\n'), audience: 'dm', origin: 'narrador' });
      }
      continue;
    }
    out.push({ id: s.id, title: s.title, chapter: s.chapter, body: withCorrections(s.body, rule), audience: rule.audience, origin });
  }
  return { sections: out, excluded };
}

function render(name: string, sections: BuiltSection[], audience: 'player' | 'dm'): string {
  const list = sections.filter((s) => s.audience === audience);
  return `// GENERADO por tools/content/build-narrative.ts a partir del compendio. No editar a mano: ejecuta \`npm run content:narrative\`.\n// Audiencia: ${audience === 'player' ? 'jugador' : 'DJ'}. Texto del compendio dividido por encabezados con clasificación explícita por sección.\nimport type { NarrativeSection } from '../schemas';\n\nexport const ${name}: NarrativeSection[] = ${JSON.stringify(list, null, 2)};\n`;
}

function main() {
  const markdown = readFileSync(input, 'utf8');
  const { sections, excluded } = buildSections(markdown);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'narrative.player.ts'), render('NARRATIVE_PLAYER', sections, 'player'));
  writeFileSync(resolve(outDir, 'narrative.dm.ts'), render('NARRATIVE_DM', sections, 'dm'));
  const count = (a: string) => sections.filter((s) => s.audience === a).length;
  console.log(`Secciones: ${count('player')} de jugador, ${count('dm')} del DJ, ${excluded.length} excluidas (datos estructurados).`);
  for (const e of excluded) console.log(`  excluida ${e.id}: ${e.reason}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
