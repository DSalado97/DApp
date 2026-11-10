import type { AttributeId, SchoolId } from '@/rules/types';
import { SpellSchema, parseCatalog, type Spell } from '../schemas';

const src = { book: 'jugador', section: 'Capítulo 5: Hechizos' } as const;

interface Raw {
  id: string;
  name: string;
  school: SchoolId;
  type: Spell['type'];
  cost: number | [number, number];
  casting?: Spell['casting'];
  target: number;
  /** [atributo, concentración] de la tirada de resistencia contra la Potencia mágica. */
  resist?: [AttributeId, string];
  range?: string;
  duration?: string;
  effect: string;
}

const spell = ({ cost, casting = 'accion-mayor', resist, ...s }: Raw) => ({
  aliases: [],
  audience: 'player',
  source: src,
  cost: Array.isArray(cost) ? { min: cost[0], max: cost[1] } : { min: cost, max: cost },
  casting,
  resistance: resist ? { attribute: resist[0], focus: resist[1] } : null,
  ...s,
});

/**
 * Los 18 hechizos de la Caja Básica (Manual del Jugador, capítulo 5). El NO es el de la tirada de lanzamiento; la
 * resistencia es una tirada del objetivo contra la Potencia mágica del lanzador. El daño penetrante ignora la armadura.
 */
export const SPELLS: Spell[] = parseCatalog(
  SpellSchema,
  [
    spell({ id: 'absorcion-de-mana', name: 'Absorción de Maná', school: 'espiritual', type: 'utilidad', cost: 3, target: 12, resist: ['magia', 'Espiritual'], range: 'practicante de magia visible a 30 m', duration: 'hasta el final del encuentro', effect: 'Estableces un vínculo parasitario. Cada vez que el objetivo lance un hechizo debe gastar 1 PM adicional y tú ganas 1 PM. El objetivo puede romper el vínculo superando la tirada de resistencia.' }),
    spell({ id: 'absorcion-de-vida', name: 'Absorción de Vida', school: 'entropia', type: 'utilidad', cost: 4, target: 12, resist: ['constitucion', 'Vigor'], range: 'objetivo visible a 10 m', effect: 'Infliges 1d6 + Magia de daño penetrante y te curas esa misma cantidad, sin superar tu Salud máxima. Si el objetivo supera la resistencia, el daño penetrante es solo 1d6.' }),
    spell({ id: 'armadura-de-roca', name: 'Armadura de Roca', school: 'primordial', type: 'defensivo', cost: [3, 8], casting: 'un-minuto', target: 10, range: 'solo sobre uno mismo', duration: '1 hora (hasta 6)', effect: 'Obtienes Armadura igual a tu atributo de Magia durante 1 hora. Cada PM gastado por encima de los 3 primeros prolonga el efecto otra hora, hasta un máximo de 6 horas. No funciona si llevas una armadura ordinaria.' }),
    spell({ id: 'atontar', name: 'Atontar', school: 'entropia', type: 'ofensivo', cost: 2, target: 11, resist: ['voluntad', 'Disciplina'], range: 'objetivo visible a 10 m', duration: 'hasta el comienzo de tu siguiente turno', effect: 'El objetivo sufre −1 a todas sus tiradas de atributo. Si supera la resistencia, solo sufre esa penalización; si falla, además no puede realizar acciones en su próximo turno.' }),
    spell({ id: 'bomba-andante', name: 'Bomba Andante', school: 'espiritual', type: 'ofensivo', cost: 4, target: 13, resist: ['constitucion', 'Vigor'], range: 'objetivo a 10 m', effect: 'Infliges 1d6+1 de daño penetrante. Al comienzo de cada turno del objetivo este debe resistir; el primer éxito termina el efecto y cada fallo causa otros 1d6+1 de daño penetrante. Si el daño lo reduce a 0 Salud, estalla: todos a 4 m o menos reciben 2d6 de daño.' }),
    spell({ id: 'brazo-invernal', name: 'Brazo Invernal', school: 'primordial', type: 'ofensivo', cost: 3, target: 12, resist: ['constitucion', 'Vigor'], range: 'objetivo visible a 20 m', duration: 'tantos asaltos como tu Magia', effect: 'Infliges 1d6 de daño penetrante y envuelves al objetivo en hielo. Al comienzo de cada turno puede resistir; el primer éxito termina el conjuro. Cada fallo causa 1d6 de daño penetrante y una penalización acumulativa de −2 a la Velocidad. Si muere por el hechizo, queda convertido en una estatua de hielo.' }),
    spell({ id: 'debilidad', name: 'Debilidad', school: 'entropia', type: 'ofensivo', cost: 3, target: 11, resist: ['magia', 'Espiritual'], range: 'enemigo visible a 20 m', duration: 'tantos asaltos como el dado dragón de la tirada de hechizo', effect: 'El objetivo sufre −1 a Fuerza y Destreza y −5 a Velocidad. Si supera la resistencia, solo sufre la penalización a la Velocidad.' }),
    spell({ id: 'descarga-electrica', name: 'Descarga Eléctrica', school: 'primordial', type: 'ofensivo', cost: 4, target: 13, resist: ['constitucion', 'Vigor'], range: 'zona de 6 × 6 m', effect: 'Los enemigos en la zona reciben 1d6 + Magia de daño penetrante. Quien supere la resistencia solo recibe 1d6 de daño penetrante.' }),
    spell({ id: 'escudo-de-hechizos', name: 'Escudo de Hechizos', school: 'espiritual', type: 'defensivo', cost: 4, target: 13, duration: 'tantos asaltos como tu Magia', effect: 'Todo hechizo lanzado sobre ti, beneficioso o perjudicial, se anula sin más efecto, pero gastas del escudo tantos PM como su coste básico (sin descontar talentos ni proezas). Un conjuro de área sigue afectando a los demás. Si no puedes pagar el coste, el escudo se deshace y el hechizo te afecta con normalidad.' }),
    spell({ id: 'estallido-de-llamas', name: 'Estallido de Llamas', school: 'primordial', type: 'ofensivo', cost: 3, target: 12, resist: ['destreza', 'Acrobacia'], range: 'franja de 8 m de alcance y 2 m de anchura', effect: 'Cada objetivo alcanzado recibe 2d6+1 de daño; quien supere la resistencia sufre solo 1d6+1.' }),
    spell({ id: 'explosion-mental', name: 'Explosión Mental', school: 'espiritual', type: 'ofensivo', cost: 3, target: 12, resist: ['fuerza', 'Fortaleza'], range: 'punto visible a 50 m o menos; radio de 2 m', effect: 'Todos los alcanzados quedan derribados y no pueden realizar acciones mayores en su próximo turno. Quien supere la resistencia solo queda derribado. En ambos casos se pierden las acciones preparadas.' }),
    spell({ id: 'glifo-de-paralisis', name: 'Glifo de Parálisis', school: 'creacion', type: 'ofensivo', cost: 3, casting: 'un-minuto', target: 10, resist: ['constitucion', 'Vigor'], range: 'invisible; se activa cuando un enemigo se acerca a 2 m', effect: 'El objetivo debe resistir o queda paralizado 1d3 asaltos: no puede realizar acciones y su Defensa baja a 7. Puedes mantener tantos glifos activos como tu Magia; cada glifo es de un solo uso.' }),
    spell({ id: 'maldicion-de-vulnerabilidad', name: 'Maldición de Vulnerabilidad', school: 'entropia', type: 'ofensivo', cost: 4, target: 12, resist: ['magia', 'Entropía'], range: 'objetivo visible a 20 m', duration: 'hasta el final del encuentro', effect: 'El objetivo sufre −1 a la Defensa y −2 a todas sus tiradas de atributo contra Potencia mágica. Si supera la resistencia, solo sufre −1 a la Defensa. Un personaje solo puede sufrir una Maldición de vulnerabilidad a la vez.' }),
    spell({ id: 'ofensiva-heroica', name: 'Ofensiva Heroica', school: 'creacion', type: 'mejora', cost: 3, target: 11, range: 'toque', duration: 'hasta el final del encuentro', effect: 'Un aliado recibe +1 a la Fuerza.' }),
    spell({ id: 'puno-petreo', name: 'Puño Pétreo', school: 'primordial', type: 'ofensivo', cost: 3, target: 11, resist: ['constitucion', 'Vigor'], range: 'enemigo visible a 20 m', effect: 'Infliges 1d6 + Magia de daño penetrante y derribas al objetivo. Si supera la resistencia, recibe solo 1d6 de daño penetrante y no cae.' }),
    spell({ id: 'sanar', name: 'Sanar', school: 'creacion', type: 'utilidad', cost: [1, 3], target: 10, range: 'toque; puede lanzarse sobre uno mismo', effect: 'Por cada PM gastado (máximo 3) el objetivo recupera 1d6 de Salud.' }),
    spell({ id: 'virote-arcano', name: 'Virote Arcano', school: 'espiritual', type: 'ofensivo', cost: 2, target: 10, resist: ['destreza', 'Acrobacia'], range: 'objetivo visible a 30 m', effect: 'Causa 2d6 + el resultado del dado dragón de la tirada de hechizo. Si el objetivo supera la resistencia, recibe solo 1d6 de daño.' }),
    spell({ id: 'voluta-de-hechizos', name: 'Voluta de Hechizos', school: 'creacion', type: 'utilidad', cost: 3, casting: 'un-minuto', target: 11, duration: 'una hora', effect: 'Invocas una voluta insustancial que te sigue y te da +1 a la Potencia mágica mientras permanece activa. No puede tocarse ni atacarse.' }),
  ],
  'hechizos',
);

/** Combinaciones de hechizos iniciales sugeridas por el manual. */
export const SUGGESTED_SPELL_SETS: { id: string; name: string; spells: string[] }[] = [
  { id: 'equilibrado', name: 'Mago equilibrado', spells: ['armadura-de-roca', 'sanar', 'virote-arcano'] },
  { id: 'creacion', name: 'Mago de Creación', spells: ['glifo-de-paralisis', 'ofensiva-heroica', 'sanar'] },
  { id: 'entropia', name: 'Mago de Entropía', spells: ['absorcion-de-vida', 'atontar', 'debilidad'] },
  { id: 'primordial', name: 'Mago Primordial', spells: ['armadura-de-roca', 'brazo-invernal', 'estallido-de-llamas'] },
  { id: 'espiritual', name: 'Mago Espiritual', spells: ['bomba-andante', 'escudo-de-hechizos', 'explosion-mental'] },
];
