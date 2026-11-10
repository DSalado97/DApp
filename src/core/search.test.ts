import { describe, expect, it } from 'vitest';
import { loadDmContent } from '@/content';
import { createSearchIndex, normalizeTerm } from './search';
import { buildDmDocs, buildPlayerDocs, plainText } from './searchDocs';

const player = createSearchIndex(buildPlayerDocs());
const titles = (q: string, opts?: Parameters<typeof player.search>[1]) => player.search(q, opts).map((h) => h.doc.title);

describe('índice de búsqueda del jugador', () => {
  it('no contiene ningún documento del DJ', () => {
    expect(player.docs.length).toBeGreaterThan(150);
    expect(player.docs.every((d) => d.audience === 'player')).toBe(true);
  });

  it('una búsqueda como jugador no devuelve contenido del DJ (criaturas, PNJ, objetos, aventura)', () => {
    for (const q of ['Mythallen', 'Hurlock', 'Genlock', 'Coalan', 'Eshara', 'vengador', 'Vhenallin', 'Vintiver', 'Harralan']) {
      expect(player.search(q), q).toEqual([]);
    }
    // Las consultas de varias palabras pueden coincidir con texto público, pero nunca con una ficha del DJ.
    for (const q of ['Segadora de Engendros', 'Eslabón de la Ira', 'cuervo sangriento', 'Tarl Dale']) {
      for (const hit of player.search(q)) {
        expect(hit.doc.audience, q).toBe('player');
        expect(['creature', 'npc', 'item']).not.toContain(hit.doc.kind);
      }
    }
    for (const q of ['moral', 'peligro', 'tesoro', 'derribo', 'sombra']) {
      for (const hit of player.search(q)) expect(hit.doc.audience, `${q} → ${hit.doc.id}`).toBe('player');
    }
  });

  it('busca por nombre, categoría y contenido', () => {
    expect(titles('virote')[0]).toBe('Virote Arcano');
    expect(titles('Sanar')).toContain('Sanar');
    expect(titles('primordial', { categories: ['Hechizos'] })).toEqual(expect.arrayContaining(['Brazo Invernal', 'Estallido de Llamas']));
    expect(titles('paralizado', { categories: ['Estados'] })).toContain('Paralizado');
    expect(titles('golpe poderoso')[0]).toBe('Golpe poderoso');
    expect(titles('potencia mágica').length).toBeGreaterThan(0);
    // Si ninguna ficha reúne todos los términos, se amplía a cualquiera de ellos.
    expect(titles('espada zorro')).toContain('Espada larga');
  });

  it('los términos del compendio funcionan como alias de búsqueda', () => {
    expect(titles('martillo de guerra')).toContain('Mazo');
    expect(titles('espadón')).toContain('Espada a dos manos');
    expect(titles('jabalina')).toContain('Lanza arrojadiza');
    expect(titles('placas pesadas')).toContain('Coraza pesada');
    expect(titles('escudo medio')).toContain('Escudo mediano');
    expect(titles('pitón')).toContain('Escarpia');
  });

  it('ignora mayúsculas y diacríticos y tolera prefijos', () => {
    expect(titles('ENTROPIA', { categories: ['Hechizos'] })).toEqual(expect.arrayContaining(['Absorción de Vida', 'Atontar', 'Debilidad']));
    expect(titles('absorc')).toEqual(expect.arrayContaining(['Absorción de Vida', 'Absorción de Maná']));
    expect(normalizeTerm('Pícaro')).toBe('picaro');
  });

  it('filtra por categoría y no devuelve nada con consulta vacía', () => {
    expect(player.search('   ')).toEqual([]);
    const armas = player.search('espada', { categories: ['Armas'] });
    expect(armas.length).toBeGreaterThan(0);
    expect(armas.every((h) => h.doc.category === 'Armas')).toBe(true);
  });

  it('indexa la narrativa de jugador por capítulo', () => {
    const hit = player.search('dado dragón', { categories: ['Reglas de juego'] });
    expect(hit.length).toBeGreaterThan(0);
    expect(player.categories()).toEqual(expect.arrayContaining(['Armas', 'Hechizos', 'Talentos', 'Reglas de juego', 'Ambientación'].filter((c) => c !== 'Ambientación')));
  });

  it('los documentos del jugador nunca arrastran Markdown', () => {
    expect(plainText('## Título\n- **negrita** y `código`\n> nota')).toBe('Título - negrita y código nota');
  });
});

describe('índice del DJ (carga diferida)', () => {
  it('incluye criaturas, PNJ, objetos y narrativa del DJ y encuentra por alias', async () => {
    const dm = await loadDmContent();
    const docs = buildDmDocs(dm);
    expect(docs.length).toBeGreaterThan(80);
    expect(docs.every((d) => d.audience === 'dm')).toBe(true);
    const index = createSearchIndex([...buildPlayerDocs(), ...docs]);
    const t = (q: string) => index.search(q).map((h) => h.doc.title);
    expect(t('Hurlock')).toContain('Hurlock');
    expect(t('mabari')).toContain('Perro de guerra mabari');
    expect(t('Harralan')).toContain('Mythallen');
    expect(t('espada de la serpiente')).toContain('Espada de la Víbora');
    expect(t('Hurlock').length).toBeGreaterThan(0);
  });
});

describe('createSearchIndex', () => {
  it('rechaza ids duplicados', () => {
    const d = { id: 'a', kind: 'k', title: 'T', aliases: [], category: 'C', text: '', audience: 'player' as const };
    expect(() => createSearchIndex([d, d])).toThrow(/duplicado/);
  });
});
