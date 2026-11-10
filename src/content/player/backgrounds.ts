import type { AttributeId, RaceId, WeaponGroupId } from '@/rules/types';
import { ATTRIBUTE_LABELS } from '@/rules/types';
import { BackgroundSchema, parseCatalog, type Background } from '../schemas';

const src = (section: string, page: number) => ({ book: 'jugador', section: `Capítulo 2: Trasfondos — ${section}`, page }) as const;

type Row = Background['benefitTables'][number]['rows'][number];

/** Beneficio de +1 a un atributo. */
const plus = (min: number, max: number, attribute: AttributeId): Row => ({
  min,
  max,
  benefit: { kind: 'attribute', attribute, value: 1 },
  label: `+1 a ${ATTRIBUTE_LABELS[attribute]}`,
});
/** Concentración de atributo. */
const focus = (min: number, max: number, attribute: AttributeId, name: string): Row => ({
  min,
  max,
  benefit: { kind: 'focus', attribute, focus: name },
  label: `Concentración: ${ATTRIBUTE_LABELS[attribute]} (${name})`,
});
const speakElvish = (min: number, max: number): Row => ({
  min,
  max,
  benefit: { kind: 'language', language: 'élfico', skill: 'hablar' },
  label: 'Hablar élfico',
});
const weaponGroup = (min: number, max: number, group: WeaponGroupId): Row => ({
  min,
  max,
  benefit: { kind: 'weaponGroup', group },
  label: 'Grupo de armas: Arcos',
});

const trade = [{ language: 'lengua comercial', skill: 'hablar-y-leer' as const }];
const GP: Background['classes'] = ['guerrero', 'picaro'];

const bg = (b: Omit<Background, 'audience' | 'aliases' | 'benefitRolls'> & { aliases?: string[] }) => ({
  audience: 'player',
  aliases: [],
  benefitRolls: 2,
  ...b,
});
const both = (races: RaceId[], rows: Row[]) => ({ appliesTo: races, rows });

/**
 * Los siete trasfondos (Manual del Jugador, capítulo 2). Cada uno da +1 a un atributo, una concentración a elegir,
 * idiomas, clases posibles y dos tiradas en una tabla 2d6 (si se repite un resultado, se vuelve a tirar).
 */
export const BACKGROUNDS: Background[] = parseCatalog(
  BackgroundSchema,
  [
    bg({
      id: 'apostata',
      name: 'Apóstata',
      source: src('Apóstata', 20),
      races: ['humano', 'elfo'],
      summary: 'Mago que practica fuera del Círculo: autodidacta, chamán o disidente, perseguido por los templarios.',
      attributeBonus: { attribute: 'voluntad', value: 1 },
      focusChoices: [
        { attribute: 'astucia', focus: 'Saber de la naturaleza' },
        { attribute: 'voluntad', focus: 'Disciplina' },
      ],
      languages: trade,
      classes: ['mago'],
      drawback: 'Debe usar sus poderes con suma cautela para no llamar la atención del Círculo ni de los templarios; sufrirá más obstáculos que sus compañeros.',
      benefitTables: [
        both(['elfo'], [plus(2, 2, 'astucia'), speakElvish(3, 4), focus(5, 5, 'astucia', 'Saber cultural'), focus(6, 6, 'voluntad', 'Disciplina'), plus(7, 8, 'magia'), focus(9, 9, 'destreza', 'Sigilo'), plus(10, 11, 'destreza'), weaponGroup(12, 12, 'arcos')]),
        both(['humano'], [plus(2, 2, 'constitucion'), focus(3, 4, 'constitucion', 'Vigor'), focus(5, 5, 'voluntad', 'Disciplina'), focus(6, 6, 'astucia', 'Curación'), plus(7, 8, 'magia'), focus(9, 9, 'destreza', 'Montar'), focus(10, 11, 'comunicacion', 'Engaño'), plus(12, 12, 'astucia')]),
      ],
    }),
    bg({
      id: 'montanes-avvarita',
      name: 'Montañés avvarita',
      aliases: ['Avvarita'],
      source: src('Montañés avvarita', 21),
      races: ['humano'],
      summary: 'Humano de los clanes de la Espalda Helada, criado en un ambiente duro y tradicional.',
      attributeBonus: { attribute: 'fuerza', value: 1 },
      focusChoices: [
        { attribute: 'comunicacion', focus: 'Manejo de animales' },
        { attribute: 'fuerza', focus: 'Trepar' },
      ],
      languages: [{ language: 'lengua comercial', skill: 'hablar' }],
      classes: GP,
      benefitTables: [
        both(['humano'], [plus(2, 2, 'destreza'), focus(3, 4, 'comunicacion', 'Juego'), focus(5, 5, 'constitucion', 'Nadar'), focus(6, 6, 'fuerza', 'Intimidación'), plus(7, 8, 'comunicacion'), focus(9, 9, 'fuerza', 'Fortaleza'), focus(10, 11, 'constitucion', 'Vigor'), plus(12, 12, 'constitucion')]),
      ],
    }),
    bg({
      id: 'elfo-dalishano',
      name: 'Elfo dalishano',
      source: src('Elfo dalishano', 22),
      races: ['elfo'],
      summary: 'Descendiente de los elfos que conservaron su identidad tras la caída de los Valles; viaja con su clan.',
      attributeBonus: { attribute: 'voluntad', value: 1 },
      focusChoices: [
        { attribute: 'destreza', focus: 'Arcos' },
        { attribute: 'voluntad', focus: 'Coraje' },
      ],
      languages: [...trade, { language: 'élfico', skill: 'hablar' }],
      classes: GP,
      benefitTables: [
        both(['elfo'], [plus(2, 2, 'comunicacion'), focus(3, 4, 'percepcion', 'Ver'), focus(5, 5, 'percepcion', 'Oír'), focus(6, 6, 'astucia', 'Saber cultural'), plus(7, 8, 'destreza'), focus(9, 9, 'voluntad', 'Disciplina'), focus(10, 11, 'destreza', 'Montar'), plus(12, 12, 'percepcion')]),
      ],
    }),
    bg({
      id: 'elfo-de-ciudad',
      name: 'Elfo de ciudad',
      source: src('Elfo de ciudad', 23),
      races: ['elfo'],
      summary: 'Vive en una elfería, bajo la desigualdad y los prejuicios de la sociedad humana.',
      attributeBonus: { attribute: 'destreza', value: 1 },
      focusChoices: [
        { attribute: 'destreza', focus: 'Sigilo' },
        { attribute: 'percepcion', focus: 'Ver' },
      ],
      languages: trade,
      classes: GP,
      benefitTables: [
        both(['elfo'], [plus(2, 2, 'astucia'), focus(3, 4, 'percepcion', 'Buscar'), focus(5, 5, 'astucia', 'Tasación'), focus(6, 6, 'destreza', 'Iniciativa'), plus(7, 8, 'percepcion'), focus(9, 9, 'comunicacion', 'Engaño'), focus(10, 11, 'destreza', 'Arcos'), plus(12, 12, 'comunicacion')]),
      ],
    }),
    bg({
      id: 'enano-de-la-superficie',
      name: 'Enano de la superficie',
      source: src('Enano de la superficie', 23),
      races: ['enano'],
      summary: 'Enano separado de las comunidades subterráneas, habituado al comercio y a vivir entre humanos.',
      attributeBonus: { attribute: 'constitucion', value: 1 },
      focusChoices: [
        { attribute: 'comunicacion', focus: 'Negociación' },
        { attribute: 'constitucion', focus: 'Vigor' },
      ],
      languages: [{ language: 'enano', skill: 'hablar-y-leer' }, ...trade],
      classes: GP,
      benefitTables: [
        both(['enano'], [plus(2, 2, 'fuerza'), focus(3, 4, 'fuerza', 'Hachas'), focus(5, 5, 'fuerza', 'Conducir'), focus(6, 6, 'comunicacion', 'Persuasión'), plus(7, 8, 'comunicacion'), focus(9, 9, 'astucia', 'Ingeniería'), focus(10, 11, 'voluntad', 'Coraje'), plus(12, 12, 'voluntad')]),
      ],
    }),
    bg({
      id: 'hombre-libre-de-ferelden',
      name: 'Hombre libre de Ferelden',
      aliases: ['Mujer libre de Ferelden'],
      source: src('Hombre libre de Ferelden', 24),
      races: ['humano'],
      summary: 'Humano fereldeno, heredero de la tradición alamarri: resistencia, lealtad y valor.',
      attributeBonus: { attribute: 'constitucion', value: 1 },
      focusChoices: [
        { attribute: 'constitucion', focus: 'Vigor' },
        { attribute: 'voluntad', focus: 'Coraje' },
      ],
      languages: trade,
      classes: GP,
      benefitTables: [
        both(['humano'], [plus(2, 2, 'comunicacion'), focus(3, 4, 'voluntad', 'Disciplina'), focus(5, 5, 'comunicacion', 'Manejo de animales'), focus(6, 6, 'destreza', 'Montar'), plus(7, 8, 'voluntad'), focus(9, 9, 'fuerza', 'Conducir'), focus(10, 11, 'constitucion', 'Nadar'), plus(12, 12, 'fuerza')]),
      ],
    }),
    bg({
      id: 'mago-del-circulo',
      name: 'Mago del Círculo',
      source: src('Mago del Círculo', 24),
      races: ['humano', 'elfo'],
      summary: 'Humano o elfo con formación mágica reglada y supervisión del Círculo de los Hechiceros.',
      attributeBonus: { attribute: 'magia', value: 1 },
      focusChoices: [
        { attribute: 'astucia', focus: 'Saber arcano' },
        { attribute: 'astucia', focus: 'Saber histórico' },
      ],
      languages: [...trade, { language: 'tevenés clásico', skill: 'leer' }],
      classes: ['mago'],
      benefitTables: [
        both(['elfo'], [plus(2, 2, 'comunicacion'), speakElvish(3, 4), focus(5, 5, 'astucia', 'Curación'), focus(6, 6, 'percepcion', 'Ver'), plus(7, 8, 'astucia'), focus(9, 9, 'astucia', 'Saber cultural'), plus(10, 11, 'destreza'), weaponGroup(12, 12, 'arcos')]),
        both(['humano'], [plus(2, 2, 'voluntad'), focus(3, 4, 'voluntad', 'Disciplina'), focus(5, 5, 'comunicacion', 'Etiqueta'), focus(6, 6, 'astucia', 'Heráldica'), plus(7, 8, 'astucia'), focus(9, 9, 'constitucion', 'Vigor'), focus(10, 11, 'astucia', 'Saber religioso'), plus(12, 12, 'constitucion')]),
      ],
    }),
  ],
  'trasfondos',
);
