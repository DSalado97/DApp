import { creature } from '../creatureBuilder';
import { CreatureSchema, parseCatalog, type Creature } from '../schemas';

const src = (page: number) => ({ book: 'jugador', section: 'Capítulo 4: Características de los animales', page }) as const;

/**
 * Monturas y animales domésticos del Manual del Jugador (audiencia de jugador). Los «no combatientes» tiran
 * siempre el ataque con +0, sea cual sea su Fuerza o su Destreza.
 */
export const ANIMALS: Creature[] = parseCatalog(
  CreatureSchema,
  [
    creature({
      id: 'caballo-de-monta',
      name: 'Caballo de monta',
      kind: 'creature',
      audience: 'player',
      source: src(45),
      summary: 'Caballo corriente para viajar y para el recreo; no está adiestrado para la guerra.',
      attributes: [-3, -3, 4, 0, 4, -2, 1, 1],
      focuses: { constitucion: ['Vigor'], percepcion: ['Oír', 'Ver'] },
      combat: { speed: 18, health: 40, defense: 10, armor: 0 },
      attacks: [['Coz', 0, '1d6+4']],
      favoredStunts: ['hostigar'],
      noncombatant: true,
    }),
    creature({
      id: 'caballo-de-tiro',
      name: 'Caballo de tiro',
      kind: 'creature',
      audience: 'player',
      source: src(46),
      summary: 'Animal lento pero fuerte que se engancha a carromatos para arrastrar cargas pesadas.',
      attributes: [-3, -3, 6, -2, 5, -2, 1, 1],
      focuses: { fuerza: ['Fortaleza'] },
      combat: { speed: 8, health: 50, defense: 8, armor: 0 },
      attacks: [['Coz', 0, '1d6+5']],
      favoredStunts: ['derribo'],
      noncombatant: true,
    }),
    creature({
      id: 'mula',
      name: 'Mula',
      kind: 'creature',
      audience: 'player',
      source: src(46),
      summary: 'Bestia de carga habitual en colinas y senderos montañosos.',
      attributes: [-3, -3, 5, -2, 4, -2, 1, 2],
      focuses: { fuerza: ['Fortaleza'] },
      combat: { speed: 10, health: 40, defense: 8, armor: 0 },
      attacks: [['Coz', 0, '1d6+4']],
      favoredStunts: ['derribo'],
      noncombatant: true,
    }),
    creature({
      id: 'halcon',
      name: 'Halcón',
      aliases: ['Ave de presa'],
      kind: 'creature',
      audience: 'player',
      source: src(46),
      summary: 'Ave de presa muy estimada por los avvaritas; sirve también para cualquier ave de presa similar.',
      attributes: [-3, -2, -1, 3, -2, -1, 3, 1],
      focuses: { destreza: ['Acrobacia'], percepcion: ['Buscar', 'Ver'] },
      combat: { speed: 4, flyingSpeed: 20, health: 10, defense: 13, armor: 0 },
      attacks: [['Pico', 3, '1d6-2']],
      favoredStunts: ['atravesar-armadura', 'hostigar'],
    }),
    creature({
      id: 'perro',
      name: 'Perro',
      aliases: ['Perro de caza', 'Perro guardián'],
      kind: 'creature',
      audience: 'player',
      source: src(46),
      summary: 'Perro guardián o de caza habitual en Ferelden (los mabari se describen en el Manual del DJ).',
      attributes: [-3, -2, 1, 2, 1, -1, 2, 0],
      focuses: { constitucion: ['Correr'], destreza: ['Mordisco'], fuerza: ['Saltar'], percepcion: ['Olfato', 'Rastrear'] },
      combat: { speed: 16, health: 15, defense: 12, armor: 0 },
      attacks: [['Mordisco', 4, '1d6+1']],
      favoredStunts: ['derribo', 'hostigar'],
    }),
  ],
  'animales',
);
