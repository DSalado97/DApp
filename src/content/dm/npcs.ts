import { creature } from '../creatureBuilder';
import { CreatureSchema, parseCatalog, type Creature } from '../schemas';

const APP = (page: number) => ({ book: 'narrador', section: 'Apéndice 1: PNJ de La maldición dalishana', page }) as const;
const OTROS = { book: 'narrador', section: 'Capítulo 3: Otros PNJ', page: 26 } as const;

/**
 * PNJ del Manual del Narrador. Los que el manual describe sin bloque de combate llevan `combat: null`:
 * no se inventan sus valores (ver RULES_GAPS).
 */
export const NPCS: Creature[] = parseCatalog(
  CreatureSchema,
  [
    creature({
      id: 'posadero', name: 'Posadero', kind: 'npc', audience: 'dm', source: OTROS, noncombatant: true,
      summary: 'PNJ genérico no combatiente: carece de habilidades de combate y procura evitar las peleas. Su tirada de ataque es siempre +0.',
      attributes: [1, 3, 2, 0, 1, 0, 2, 1],
      focuses: { astucia: ['Tasación'], comunicacion: ['Negociación', 'Persuasión'], constitucion: ['Beber alcohol'], percepcion: ['Gusto'], voluntad: ['Moral'] },
      combat: null,
    }),
    creature({
      id: 'aldeano-furioso', name: 'Aldeano furioso', aliases: ['Turba de aldeanos enfurecidos'], kind: 'npc', audience: 'dm', source: APP(58),
      summary: 'Vecino asustado y furioso, armado con herramientas y garrotes. En la turba de Coalan intentan dejar inconscientes, no matar; se retiran si cae Coalan o si más de la mitad son derrotados.',
      attributes: [0, 0, 1, 2, 1, 0, 1, 0],
      focuses: { comunicacion: ['Manejo de animales', 'Negociación'], constitucion: ['Vigor'], percepcion: ['Ver'] },
      combat: { speed: 12, health: 11, defense: 12, armor: 0 },
      attacks: [['Garrote', 2, '1d6+1'], ['Puño', 2, '1d3+1']],
      favoredStunts: ['derribo', 'hostigar'],
      weaponGroups: ['bastones', 'pelea'],
      equipment: 'Garrote.',
      notes: 'Si un PJ reduce a un aldeano a 0 Salud decide entre un golpe letal o contener el golpe (el aldeano queda a 1 Salud e inconsciente), con consecuencias en la defensa posterior de Vintiver.',
    }),
    creature({
      id: 'coalan', name: 'Coalan', aliases: ['Coalan, herrero'], kind: 'npc', audience: 'dm', source: APP(58),
      summary: 'Herrero corpulento, honrado y de temperamento explosivo; portavoz de los aldeanos exaltados contra los dalishanos.',
      attributes: [0, 1, 2, 1, 3, 0, 0, 1],
      focuses: { comunicacion: ['Liderazgo'], constitucion: ['Beber alcohol'], destreza: ['Pelea'], fuerza: ['Armas contundentes', 'Fortaleza', 'Intimidación'], voluntad: ['Coraje', 'Moral'] },
      combat: { speed: 11, health: 25, defense: 11, armor: 3 },
      attacks: [['Mazo', 5, '1d6+6'], ['Puño', 3, '1d6+3']],
      favoredStunts: ['golpe-doble', 'golpe-poderoso'],
      talents: [{ talent: 'combate-sin-armas', rank: 'aprendiz' }, { talent: 'entrenamiento-armaduras', rank: 'aprendiz' }],
      weaponGroups: ['contundentes', 'pelea'],
      equipment: 'Mazo y armadura de cuero ligera.',
    }),
    creature({
      id: 'eshara', name: 'Eshara', aliases: ['Eshara, superviviente dalishana'], kind: 'npc', audience: 'dm', source: APP(59),
      summary: 'Joven elfa dalishana, guardiana del saber en formación; escapó de Mythallen con el Eslabón de la Ira. Al encontrarla está inconsciente y febril: Astucia (Curación) NO 11 la estabiliza, pero necesita reposo.',
      attributes: [2, 1, 1, 2, 1, 0, 3, 2],
      focuses: { astucia: ['Saber cultural'], destreza: ['Hojas ligeras'], voluntad: ['Coraje'] },
      combat: { speed: 14, health: 34, defense: 12, armor: 3 },
      attacks: [['Daga', 4, '1d6+2']],
      favoredStunts: ['atravesar-armadura', 'hostigar'],
      talents: [{ talent: 'exploracion', rank: 'aprendiz' }],
      weaponGroups: ['arcos', 'bastones', 'hojas-ligeras', 'pelea'],
      equipment: 'Daga y armadura de cuero ligera.',
      classLevel: { class: 'picaro', level: 2 },
      abilities: [
        { id: 'armadura-de-picaro', name: 'Armadura de pícaro', text: 'Ignora por completo la penalización de las armaduras de cuero.' },
        { id: 'atravesar-armadura-economico', name: 'Atravesar armadura (1 PP)', stuntCost: 1, text: 'Puede realizar Atravesar armadura por 1 PP en vez de 2.' },
        { id: 'punalada', name: 'Puñalada', text: 'Aptitud de pícaro de nivel 1.' },
      ],
    }),
    creature({
      id: 'tarl-dale', name: 'Tarl Dale', aliases: ['Tarl Dale, guarda de Vintiver', 'Guarda de la aldea'], kind: 'npc', audience: 'dm', source: APP(61),
      summary: 'Antiguo soldado del bann, retirado y de más de cincuenta años; autoridad legal de Vintiver. No culpa a los dalishanos.',
      attributes: [1, 2, 4, 1, 3, 0, 1, 1],
      focuses: { astucia: ['Saber militar'], comunicacion: ['Liderazgo'], constitucion: ['Nadar'], destreza: ['Montar'], voluntad: ['Coraje'] },
      combat: { speed: 9, health: 52, defense: 11, armor: 5 },
      attacks: [['Daga', 1, '1d6+4'], ['Espada larga', 3, '2d6+3']],
      favoredStunts: ['golpe-doble', 'golpe-poderoso'],
      talents: [{ talent: 'combate-arma-escudo', rank: 'aprendiz' }, { talent: 'combate-un-arma', rank: 'experto' }, { talent: 'entrenamiento-armaduras', rank: 'aprendiz' }],
      weaponGroups: ['bastones', 'hojas-ligeras', 'hojas-pesadas', 'lanzas', 'pelea'],
      equipment: 'Armadura de malla ligera, espada larga y daga.',
      classLevel: { class: 'guerrero', level: 4 },
      abilities: [{ id: 'golpe-doble-economico', name: 'Golpe doble (3 PP)', stuntCost: 3, text: 'Puede realizar Golpe doble por 3 PP en lugar de 4.' }],
    }),
    creature({
      id: 'hermana-arda', name: 'Hermana Arda', aliases: ['Sacerdotisa de la capilla'], kind: 'npc', audience: 'dm', source: APP(60), noncombatant: true,
      summary: 'Sacerdotisa de la Capilla formada en Denerim, en Vintiver desde hace unos dieciocho años. Atiende a los heridos; no está pensada como combatiente.',
      attributes: [2, 3, 0, 1, 1, 0, 2, 3],
      focuses: { astucia: ['Curación', 'Saber cultural', 'Saber histórico', 'Saber religioso'], comunicacion: ['Persuasión'], percepcion: ['Empatía'], voluntad: ['Disciplina', 'Fe'] },
      combat: null,
      talents: [{ talent: 'quirurgia', rank: 'experto' }],
      notes: 'Quirurgía (Experto): cura con acciones menores y devuelve el doble de la suma del dado dragón y su Astucia en Salud.',
    }),
    creature({
      id: 'orellis', name: 'Orellis', aliases: ['Orellis, guardián del saber dalishano'], kind: 'npc', audience: 'dm', source: APP(60), noncombatant: true,
      summary: 'Anciano elfo, guardián del saber dalishano; desconfía de los humanos, pero apoya a quienes ayudaron a Eshara. Sabe quién era Harralan y qué es Mythallen.',
      attributes: [5, 3, 0, 2, 0, 2, 2, 3],
      focuses: { astucia: ['Navegación', 'Saber cultural', 'Saber de la naturaleza', 'Saber histórico', 'Saber religioso'], comunicacion: ['Liderazgo'], destreza: ['Arcos'], percepcion: ['Ver'], voluntad: ['Disciplina'] },
      combat: null,
    }),
    creature({
      id: 'haran-mullin', name: 'Haran Mullin', kind: 'npc', audience: 'dm', source: APP(59), noncombatant: true,
      summary: 'Posadero hospitalario y trabajador, protector de su familia y vecinos; sus hijos colaboran en la posada.',
      attributes: [0, 1, 2, 1, 2, 0, 1, 1],
      focuses: { comunicacion: ['Manejo de animales', 'Negociación'], constitucion: ['Beber alcohol'], percepcion: ['Oír'] },
      combat: null,
    }),
    creature({
      id: 'kesla-mullin', name: 'Kesla Mullin', kind: 'npc', audience: 'dm', source: APP(59), noncombatant: true,
      summary: 'Posadera, voz serena de la comunidad; no dejará que sus hijos se alejen de casa hasta que pase el peligro.',
      attributes: [1, 2, 1, 2, 0, 0, 2, 1],
      focuses: { astucia: ['Saber cultural', 'Tasación'], comunicacion: ['Negociación', 'Persuasión'], percepcion: ['Ver'] },
      combat: null,
    }),
  ],
  'pnj',
);
