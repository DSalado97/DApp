import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
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
  loadDmContent,
  focusKey,
} from '@/content';
import { NARRATIVE_DM } from '@/content/generated/narrative.dm';
import { SECTION_RULES } from '@/content/narrativeClassification';
import { NarrativeSectionSchema } from '@/content/schemas';
import { parseDice } from '@/rules/dice';
import { ATTRIBUTES, WEAPON_GROUPS, type ArmorId } from '@/rules/types';
import { SPELL_ARMOR_IMPEDIMENT } from '@/rules/magic';
import { ATTACK_ATTRIBUTE } from '@/rules/attack';

const dm = await loadDmContent();
const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);

describe('recuentos del contenido (Caja Básica)', () => {
  it('22 talentos, 18 hechizos, 7 trasfondos y 3 clases', () => {
    expect(TALENTS).toHaveLength(22);
    expect(SPELLS).toHaveLength(18);
    expect(BACKGROUNDS).toHaveLength(7);
    expect(CLASSES_DATA).toHaveLength(3);
  });

  it('armas, armaduras, escudos y proezas', () => {
    expect(WEAPONS).toHaveLength(24);
    expect(ARMORS).toHaveLength(6);
    expect(SHIELDS).toHaveLength(3);
    expect(STUNTS.filter((s) => s.kind === 'combate')).toHaveLength(10);
    expect(STUNTS.filter((s) => s.kind === 'magia')).toHaveLength(6);
  });

  it('67 concentraciones de personaje en 8 atributos', () => {
    expect(FOCI).toHaveLength(67);
    expect(new Set(FOCI.map((f) => f.attribute)).size).toBe(8);
    expect(FOCI.filter((f) => f.attribute === 'astucia')).toHaveLength(15);
  });

  it('criaturas, PNJ y objetos mágicos del DJ', () => {
    expect(dm.CREATURES).toHaveLength(22); // 19 del bestiario + 3 exclusivas de La maldición dalishana
    expect(dm.NPCS).toHaveLength(9);
    expect(dm.MAGIC_ITEMS.filter((i) => i.kind === 'temporal')).toHaveLength(5);
    expect(dm.MAGIC_ITEMS.filter((i) => i.kind === 'permanente' && i.id !== 'eslabon-de-la-ira')).toHaveLength(10);
  });

  it('estados catalogados: derribado, inmovilizado, paralizado, inconsciente y moribundo', () => {
    expect(ids(CONDITIONS).sort()).toEqual(['derribado', 'inconsciente', 'inmovilizado', 'moribundo', 'paralizado']);
  });
});

describe('identificadores y trazabilidad', () => {
  const all = [
    ...WEAPONS, ...ARMORS, ...SHIELDS, ...GEAR, ...STUNTS, ...TALENTS, ...CLASSES_DATA, ...BACKGROUNDS, ...SPELLS, ...CONDITIONS,
    ...PLAYER_TABLES, ...ANIMALS, ...dm.CREATURES, ...dm.NPCS, ...dm.MAGIC_ITEMS, ...dm.DM_TABLES,
  ];

  it('cada registro lleva source (libro y sección) y audience', () => {
    for (const r of all) {
      expect(r.source.section.length, r.id).toBeGreaterThan(0);
      expect(['jugador', 'narrador']).toContain(r.source.book);
      expect(['player', 'dm']).toContain(r.audience);
    }
  });

  it('los ids son estables y únicos dentro de cada catálogo; las armas y talentos son compartibles entre módulos', () => {
    for (const list of [WEAPONS, ARMORS, SHIELDS, GEAR, STUNTS, TALENTS, SPELLS, dm.CREATURES, dm.NPCS]) {
      expect(new Set(ids(list)).size).toBe(list.length);
    }
    expect(ids(WEAPONS)).toContain('espada-corta');
    expect(ids(SPELLS)).toContain('virote-arcano');
    expect(ids(STUNTS)).toContain('golpe-poderoso');
    expect(ids(TALENTS)).toContain('combate-un-arma');
  });

  it('el contenido del jugador es de audiencia jugador y el del DJ, de audiencia DJ', () => {
    for (const r of [...WEAPONS, ...ARMORS, ...SHIELDS, ...GEAR, ...STUNTS, ...TALENTS, ...CLASSES_DATA, ...BACKGROUNDS, ...SPELLS, ...CONDITIONS, ...PLAYER_TABLES, ...ANIMALS]) {
      expect(r.audience, r.id).toBe('player');
    }
    for (const r of [...dm.CREATURES, ...dm.NPCS, ...dm.MAGIC_ITEMS, ...dm.DM_TABLES]) expect(r.audience, r.id).toBe('dm');
  });

  it('las referencias cruzadas apuntan a registros que existen', () => {
    const stuntIds = new Set(ids(STUNTS));
    const talentIds = new Set(ids(TALENTS));
    for (const t of TALENTS) for (const sc of t.stuntCosts) expect(stuntIds.has(sc.stuntId), `${t.id} → ${sc.stuntId}`).toBe(true);
    for (const c of CLASSES_DATA) for (const l of c.levels) for (const f of l.features) for (const sc of f.stuntCosts) expect(stuntIds.has(sc.stuntId)).toBe(true);
    for (const i of dm.MAGIC_ITEMS) for (const sc of i.stuntCosts) expect(stuntIds.has(sc.stuntId)).toBe(true);
    for (const c of [...ANIMALS, ...dm.CREATURES, ...dm.NPCS]) {
      const own = new Set(c.abilities.map((a) => a.id));
      for (const t of c.talents) expect(talentIds.has(t.talent), `${c.id} talento ${t.talent}`).toBe(true);
      for (const s of c.favoredStunts) expect(stuntIds.has(s) || own.has(s), `${c.id} proeza ${s}`).toBe(true);
    }
    for (const c of CLASSES_DATA) {
      expect(c.weaponGroups.fixed.every((g) => WEAPON_GROUPS.includes(g))).toBe(true);
    }
  });
});

describe('armas, armaduras y escudos (contraste con el Manual del Jugador, p. 42)', () => {
  const w = (id: string) => WEAPONS.find((x) => x.id === id)!;

  it('daño, Fuerza mínima y precio del manual', () => {
    expect(w('arco-corto')).toMatchObject({ damage: '1d6+1', minStrength: -1, price: 9, group: 'arcos' });
    expect(w('ballesta')).toMatchObject({ damage: '2d6+1', minStrength: 1, price: 20 });
    expect(w('hacha-arrojadiza')).toMatchObject({ damage: '1d6+2', minStrength: 1, price: 10 });
    expect(w('espada-bastarda')).toMatchObject({ damage: '2d6+1', minStrength: 2, price: 20 });
    expect(w('espada-larga')).toMatchObject({ damage: '2d6', minStrength: 1, price: 18 });
    expect(w('espada-dos-manos')).toMatchObject({ damage: '3d6', minStrength: 3, price: 23, twoHanded: true });
    expect(w('lanza')).toMatchObject({ minStrength: 0, price: 12 });
  });

  it('errata: Guantelete y Puño (omitidos en el compendio)', () => {
    expect(w('guantelete')).toMatchObject({ damage: '1d3+1', price: 4, group: 'pelea' });
    expect(w('puno')).toMatchObject({ damage: '1d3', group: 'pelea' });
  });

  it('errata: alcances corto/largo y recarga', () => {
    expect(w('arco-corto')).toMatchObject({ range: { short: 16, long: 32 }, reload: 'menor' });
    expect(w('arco-largo')).toMatchObject({ range: { short: 26, long: 52 }, reload: 'menor' });
    expect(w('ballesta')).toMatchObject({ range: { short: 30, long: 60 }, reload: 'mayor' });
    expect(w('cuchillo-arrojadizo')).toMatchObject({ range: { short: 6, long: 12 }, reload: 'menor' });
    expect(w('hacha-arrojadiza')).toMatchObject({ range: { short: 4, long: 8 }, reload: 'menor' });
    expect(w('lanza-arrojadiza')).toMatchObject({ range: { short: 8, long: 16 }, reload: 'menor' });
    expect(WEAPONS.filter((x) => x.range).map((x) => x.id).sort()).toEqual(['arco-corto', 'arco-largo', 'ballesta', 'cuchillo-arrojadizo', 'hacha-arrojadiza', 'lanza-arrojadiza']);
  });

  it('errata: terminología del manual con los términos del compendio como alias', () => {
    const alias = (id: string, a: string) => expect(WEAPONS.find((x) => x.id === id)?.aliases ?? ARMORS.find((x) => x.id === id)?.aliases ?? SHIELDS.find((x) => x.id === id)?.aliases).toContain(a);
    alias('mazo', 'Martillo de guerra');
    alias('mazo-dos-manos', 'Martillo a dos manos');
    alias('baculo', 'Bastón');
    alias('espada-dos-manos', 'Espadón');
    alias('lanza-arrojadiza', 'Jabalina');
    alias('coraza-ligera', 'Placas ligeras');
    alias('coraza-pesada', 'Placas pesadas');
    alias('escudo-mediano', 'Escudo medio');
    expect(WEAPONS.map((x) => x.name)).not.toContain('Martillo de guerra');
  });

  it('cada arma tiene su dado, y el atributo de ataque sale del grupo', () => {
    for (const x of WEAPONS) {
      expect(() => parseDice(x.damage)).not.toThrow();
      expect(ATTRIBUTES).toContain(ATTACK_ATTRIBUTE[x.group]);
      if (x.thrown) expect(x.range, x.id).toBeDefined();
    }
  });

  it('armaduras: valor, impedimento y maná extra coinciden con las tablas', () => {
    const expected: Record<string, [number, number, number, number]> = {
      'cuero-ligera': [3, 0, 1, 15], 'cuero-pesada': [4, 1, 2, 30], 'malla-ligera': [5, 2, 3, 50],
      'malla-pesada': [7, 3, 4, 75], 'coraza-ligera': [8, 4, 5, 100], 'coraza-pesada': [10, 5, 6, 150],
    };
    for (const a of ARMORS) {
      expect([a.armorValue, a.impediment, a.spellManaExtra, a.price], a.id).toEqual(expected[a.id]);
      expect(SPELL_ARMOR_IMPEDIMENT[a.id as ArmorId]).toBe(a.spellManaExtra);
    }
    expect(SHIELDS.map((s) => [s.id, s.defenseBonus, s.price])).toEqual([['escudo-ligero', 1, 15], ['escudo-mediano', 2, 30], ['escudo-pesado', 3, 60]]);
  });

  it('equipo con los nombres del manual', () => {
    const names = GEAR.map((g) => g.name);
    expect(names).toContain('Escarpia');
    expect(names).toContain('Farol');
    expect(names).toContain('Carromato');
    expect(names).not.toContain('Pitón');
  });
});

describe('hechizos, talentos, clases y trasfondos', () => {
  it('hechizos: escuela, coste y NO del manual (muestra)', () => {
    const s = (id: string) => SPELLS.find((x) => x.id === id)!;
    expect(s('virote-arcano')).toMatchObject({ school: 'espiritual', cost: { min: 2, max: 2 }, target: 10 });
    expect(s('sanar')).toMatchObject({ school: 'creacion', cost: { min: 1, max: 3 }, target: 10, resistance: null });
    expect(s('armadura-de-roca')).toMatchObject({ school: 'primordial', cost: { min: 3, max: 8 }, casting: 'un-minuto', target: 10 });
    expect(s('descarga-electrica')).toMatchObject({ cost: { min: 4, max: 4 }, target: 13 });
    expect(s('bomba-andante')).toMatchObject({ school: 'espiritual', target: 13 });
    expect(s('maldicion-de-vulnerabilidad').resistance).toMatchObject({ attribute: 'magia', focus: 'Entropía' });
    expect(s('glifo-de-paralisis')).toMatchObject({ school: 'creacion', casting: 'un-minuto', target: 10 });
    // Creación 4, Entropía 4, Espiritual 5, Primordial 5
    const bySchool = (k: string) => SPELLS.filter((x) => x.school === k).length;
    expect([bySchool('creacion'), bySchool('entropia'), bySchool('espiritual'), bySchool('primordial')]).toEqual([4, 4, 5, 5]);
  });

  it('proezas: costes del manual', () => {
    const cost = Object.fromEntries(STUNTS.map((s) => [s.id, s.cost]));
    expect(cost).toMatchObject({
      hostigar: 1, 'recarga-rapida': 1, 'atravesar-armadura': 2, derribo: 2, desarmar: 2, 'golpe-poderoso': 2, 'postura-defensiva': 2,
      'ataque-relampago': 3, 'golpe-doble': 4, 'tomar-la-iniciativa': 4,
      'lanzamiento-energico': 1, 'lanzamiento-habil': 2, 'hechizo-potente': 2, 'escudo-de-mana': 3, 'lanzamiento-rapido': 4, 'hechizo-imponente': 4,
    });
    expect(STUNTS.filter((s) => !s.oncePerRound).map((s) => s.id)).toEqual(['hostigar']);
    expect(STUNTS.filter((s) => s.noExtraPoints).map((s) => s.id).sort()).toEqual(['ataque-relampago', 'lanzamiento-rapido']);
  });

  it('talentos: dos rangos, clases y requisitos', () => {
    const t = (id: string) => TALENTS.find((x) => x.id === id)!;
    expect(t('combate-armas-dos-manos').requirements.attributes).toEqual([{ attribute: 'fuerza', min: 3 }]);
    expect(t('combate-armas-dos-manos').requirements.trainedGroupAnyOf).toEqual(['contundentes', 'hachas', 'hojas-pesadas', 'lanzas']);
    expect(t('exploracion').classes).toEqual(['picaro']);
    expect(t('mando').classes).toEqual(['guerrero', 'mago']);
    expect(t('magia-creacion').schoolExpertise).toBe('creacion');
    expect(TALENTS.filter((x) => x.schoolExpertise)).toHaveLength(4);
    for (const x of TALENTS) {
      expect(x.apprentice.length).toBeGreaterThan(10);
      expect(x.expert.length).toBeGreaterThan(10);
    }
  });

  it('clases: Salud, atributos primarios y progresión niveles 1 a 5', () => {
    const c = (id: string) => CLASSES_DATA.find((x) => x.id === id)!;
    expect(c('guerrero').baseHealth).toBe(30);
    expect(c('picaro').baseHealth).toBe(25);
    expect(c('mago').baseHealth).toBe(20);
    expect(c('guerrero').primaryAttributes).toEqual(['constitucion', 'destreza', 'fuerza']);
    expect(c('mago').startingMana).toEqual({ base: 10, perLevelAttribute: 'magia' });
    expect(c('guerrero').weaponGroups.choose?.count).toBe(3);
    for (const cls of CLASSES_DATA) {
      expect(cls.levels.map((l) => l.level)).toEqual([1, 2, 3, 4, 5]);
      const attrs = new Set([...cls.primaryAttributes, ...cls.secondaryAttributes]);
      expect(attrs.size).toBe(8);
    }
    const stuntFeature = (cls: string, level: number) => c(cls).levels[level - 1]!.features.flatMap((f) => f.stuntCosts);
    expect(stuntFeature('guerrero', 4)).toEqual([{ stuntId: 'golpe-doble', cost: 3 }]);
    expect(stuntFeature('picaro', 2)).toEqual([{ stuntId: 'atravesar-armadura', cost: 1 }]);
  });

  it('trasfondos: tablas 2d6 completas y concentraciones del catálogo', () => {
    const foci = new Set(FOCI.map((f) => focusKey(f.attribute, f.name)));
    for (const b of BACKGROUNDS) {
      expect(b.benefitRolls).toBe(2);
      for (const fc of b.focusChoices) expect(foci.has(focusKey(fc.attribute, fc.focus)), `${b.id}: ${fc.focus}`).toBe(true);
      const covered = new Set<string>();
      for (const table of b.benefitTables) {
        const seen: number[] = [];
        for (const row of table.rows) {
          expect(row.min).toBeLessThanOrEqual(row.max);
          for (let n = row.min; n <= row.max; n++) seen.push(n);
          if (row.benefit.kind === 'focus') expect(foci.has(focusKey(row.benefit.attribute, row.benefit.focus)), `${b.id}: ${row.label}`).toBe(true);
        }
        expect(seen.sort((a, c) => a - c), b.id).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        table.appliesTo.forEach((r) => covered.add(r));
      }
      for (const r of b.races) expect(covered.has(r), `${b.id} sin tabla para ${r}`).toBe(true);
    }
    const apostata = BACKGROUNDS.find((b) => b.id === 'apostata')!;
    expect(apostata.classes).toEqual(['mago']);
    expect(apostata.benefitTables).toHaveLength(2); // una columna por raza (elfo y humano)
    expect(BACKGROUNDS.find((b) => b.id === 'mago-del-circulo')!.languages).toContainEqual({ language: 'tevenés clásico', skill: 'leer' });
  });
});

describe('criaturas y PNJ: valores literales', () => {
  const c = (id: string) => dm.CREATURES.find((x) => x.id === id) ?? dm.NPCS.find((x) => x.id === id) ?? ANIMALS.find((x) => x.id === id)!;

  it('los atributos de criatura pueden superar 4 (Oso negro: 6)', () => {
    const oso = c('oso-negro');
    expect(oso.attributes.constitucion).toBe(6);
    expect(oso.attributes.fuerza).toBe(6);
    expect(Math.max(...dm.CREATURES.flatMap((x) => Object.values(x.attributes)))).toBeGreaterThan(4);
  });

  it('el Cazador avvarita lista Armadura 3 con malla ligera y ese dato se respeta', () => {
    const cazador = c('cazador-avvarita');
    expect(cazador.equipment).toContain('malla ligera');
    expect(cazador.combat).toMatchObject({ armor: 3, health: 20, defense: 11, defenseWithShield: 13, speed: 9 });
  });

  it('ficha literal: ataques, Defensa y Salud tal como se publican', () => {
    expect(c('genlock').combat).toMatchObject({ speed: 7, health: 22, defense: 11, defenseWithShield: 13, armor: 5 });
    expect(c('hurlock').attacks.find((a) => a.name === 'Espada a dos manos')).toMatchObject({ bonus: 6, damage: '3d6+4' });
    expect(c('oso-negro').attacks).toEqual([
      { name: 'Garras', bonus: 8, damage: '2d6+6', penetrating: false },
      { name: 'Mordisco', bonus: 4, damage: '1d6+6', penetrating: false },
    ]);
    expect(c('sombra').attacks[0]).toMatchObject({ penetrating: true, bonus: 5, damage: '1d6+4' });
    expect(c('cuervo-sangriento').combat).toMatchObject({ speed: 5, flyingSpeed: 20, health: 10, defense: 13, armor: 0 });
    expect(c('mythallen').combat).toMatchObject({ health: 60, armor: 5, defense: 13, speed: 15 });
    expect(c('draconido').attacks.find((a) => a.name === 'Llamarada')?.range).toEqual({ short: 6, long: 12 });
  });

  it('las concentraciones de criatura son un catálogo abierto (Mordisco, Garras, Cornada, Tacto, Gusto no son de PJ)', () => {
    const personaje = new Set(FOCI.map((f) => f.name));
    for (const n of ['Mordisco', 'Garras', 'Cornada', 'Tacto', 'Gusto']) {
      expect(personaje.has(n)).toBe(false);
      expect(dm.CREATURE_FOCI.map((f) => f.name)).toContain(n);
      const used = [...dm.CREATURES, ...dm.NPCS, ...ANIMALS].some((cr) => Object.values(cr.focuses).some((names) => names?.includes(n)));
      expect(used, n).toBe(true);
    }
  });

  it('PNJ sin bloque de combate no inventan valores (combat: null)', () => {
    for (const id of ['posadero', 'hermana-arda', 'orellis', 'haran-mullin', 'kesla-mullin']) expect(c(id).combat, id).toBeNull();
    expect(c('eshara').classLevel).toEqual({ class: 'picaro', level: 2 });
    expect(c('tarl-dale').combat).toMatchObject({ health: 52, armor: 5 });
  });

  it('todos los ataques tienen dados válidos y toda criatura con combate tiene valores completos', () => {
    for (const cr of [...dm.CREATURES, ...dm.NPCS, ...ANIMALS]) {
      for (const a of cr.attacks) expect(() => parseDice(a.damage), `${cr.id}/${a.name}`).not.toThrow();
      if (cr.combat) expect(cr.combat.health).toBeGreaterThan(0);
      if (!cr.noncombatant && cr.combat) expect(cr.attacks.length, cr.id).toBeGreaterThan(0);
    }
  });

  it('animales y monturas son contenido de jugador; los no combatientes lo declaran', () => {
    expect(ANIMALS.map((a) => a.id)).toEqual(['caballo-de-monta', 'caballo-de-tiro', 'mula', 'halcon', 'perro']);
    expect(ANIMALS.filter((a) => a.noncombatant)).toHaveLength(3);
    expect(c('caballo-de-monta').combat).toMatchObject({ speed: 18, health: 40, defense: 10 });
  });
});

describe('objetos mágicos', () => {
  const item = (id: string) => dm.MAGIC_ITEMS.find((i) => i.id === id)!;
  it('nombres y efectos del manual (con alias del compendio)', () => {
    expect(item('espada-de-la-vibora').aliases).toContain('Espada de la serpiente');
    expect(item('espada-de-la-vibora').stuntCosts).toEqual([{ stuntId: 'tomar-la-iniciativa', cost: 3 }]);
    expect(item('anillo-de-proteccion').stuntCosts).toEqual([{ stuntId: 'escudo-de-mana', cost: 2 }]);
    expect(item('piedra-brillante').aliases).toContain('Piedra luminosa');
    expect(item('cota-de-firmeza').effect).toMatch(/6/);
  });
});

describe('tablas', () => {
  it('modificadores, peligros, experiencia y tesoros del DJ; dificultades del jugador', () => {
    const t = (id: string) => [...PLAYER_TABLES, ...dm.DM_TABLES].find((x) => x.id === id)!;
    expect(t('dificultad-tiradas-basicas').rows).toHaveLength(8);
    expect(t('modificadores-al-ataque').rows).toHaveLength(7);
    expect(t('categorias-de-peligro').rows[5]).toEqual(['Peligro mortal', '6d6']);
    expect(t('recompensas-de-experiencia').rows).toEqual([['Rutinario', '0 PE'], ['Fácil', '100 PE'], ['Moderado', '200 PE'], ['Difícil', '300 PE']]);
    expect(t('categorias-de-tesoro').rows).toHaveLength(6);
    expect(t('tiradas-avanzadas').rows.map((r) => r[1])).toEqual(['5', '10', '15', '20', '25']);
    expect(t('calculo-de-atributos').rows).toHaveLength(7);
  });
});

describe('narrativa dividida por encabezados', () => {
  const generated = [...NARRATIVE_PLAYER, ...NARRATIVE_DM];

  it('cumple el esquema y no repite ids', () => {
    z.array(NarrativeSectionSchema).parse(generated);
    expect(new Set(generated.map((s) => s.id)).size).toBe(generated.length);
  });

  it('respeta la clasificación explícita: 1 a 6 jugador, 8 a 11 DJ, 7 según el manual de origen', () => {
    const audience = (id: string) => generated.find((s) => s.id === id)?.audience;
    for (const id of ['1.1', '2.3', '3.1', '3.8', '4.1', '5.1', '6.1', '6.6']) expect(audience(id), id).toBe('player');
    for (const id of ['8.1', '8.10', '9.1', '9.6', '10.1', '11.1', '11.11']) expect(audience(id), id).toBe('dm');
    for (const id of ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.10', '7.11']) expect(audience(id), id).toBe('player');
    for (const id of ['7.9', '7.12', '7.14']) expect(audience(id), id).toBe('dm');
    expect(audience('7.13')).toBe('player'); // combate montado (Manual del Jugador)
    expect(audience('7.13b')).toBe('dm'); // criaturas voladoras (Manual del Narrador)
  });

  it('cada sección generada tiene regla de clasificación coherente y las excluidas no se generan', () => {
    for (const s of generated) {
      const base = s.id.replace(/b$/, '');
      const rule = SECTION_RULES[base];
      expect(rule, s.id).toBeDefined();
      expect(rule!.audience).not.toBe('excluded');
    }
    const excluded = Object.entries(SECTION_RULES).filter(([, r]) => r.audience === 'excluded').map(([id]) => id);
    expect(excluded.sort()).toEqual(['10.2', '11.12', '3.4', '3.5', '4.2', '5.2', '5.3', '5.4', '5.5', '5.6', '6.5', '9.5']);
    for (const id of excluded) expect(generated.some((s) => s.id === id)).toBe(false);
  });

  it('las correcciones verificadas se añaden al texto', () => {
    const body = (id: string) => NARRATIVE_PLAYER.find((s) => s.id === id)!.body;
    expect(body('7.6')).toContain('Corrección verificada en el manual');
    expect(body('7.6')).toContain('comienzo de su turno');
    expect(body('7.11')).toContain('una vez por asalto');
    expect(body('3.2')).toContain('Astucia, Comunicación');
  });

  it('el glosario del jugador no incluye términos exclusivos de la aventura', () => {
    expect(NARRATIVE_PLAYER.find((s) => s.id === '13')!.body).not.toContain('Vhenallin');
    expect(NARRATIVE_DM.find((s) => s.id === '13b')!.body).toContain('Vhenallin');
  });

  it('el contenido del jugador no menciona criaturas ni PNJ exclusivos del DJ', () => {
    const text = JSON.stringify([...NARRATIVE_PLAYER, ...WEAPONS, ...SPELLS, ...TALENTS]).toLowerCase();
    for (const secret of ['mythallen', 'hurlock', 'genlock', 'harralan', 'eslabón de la ira', 'coalan']) expect(text, secret).not.toContain(secret);
  });
});

describe('separación jugador / DJ en el código', () => {
  const dir = join(process.cwd(), 'src', 'content', 'player');
  it('ningún módulo de content/player importa de content/dm', () => {
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), 'utf8');
      expect(source, file).not.toMatch(/from\s+['"][^'"]*\/dm(\/|['"])/);
      expect(source, file).not.toMatch(/generated\/narrative\.dm/);
    }
  });

  it('el punto de entrada solo carga el DJ con una importación diferida', () => {
    const entry = readFileSync(join(process.cwd(), 'src', 'content', 'index.ts'), 'utf8');
    expect(entry).toMatch(/import\('\.\/dm'\)/);
    expect(entry).not.toMatch(/from\s+['"]\.\/dm['"]/);
    expect(entry).not.toMatch(/narrative\.dm/);
  });
});
