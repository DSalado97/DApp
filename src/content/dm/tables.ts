import { z } from 'zod';
import { FocusSchema, TableSchema, parseCatalog, type Focus, type GameTable } from '../schemas';

const N = (section: string, page: number) => ({ book: 'narrador', section, page }) as const;
const table = (t: Omit<GameTable, 'audience'>) => ({ audience: 'dm', ...t });

/** Tablas del Manual del Narrador: modificadores de ataque, peligros, experiencia y tesoros. */
export const DM_TABLES: GameTable[] = parseCatalog(
  TableSchema,
  [
    table({
      id: 'modificadores-al-ataque',
      name: 'Modificadores al ataque',
      columns: ['Modificador', 'Circunstancia'],
      rows: [
        ['−3', 'Objetivo tras cobertura sólida (un edificio, un muro de piedra). Atacar cuerpo a cuerpo pisando una espesa capa de nieve.'],
        ['−2', 'Objetivo tras cobertura ligera (un seto, el bosque). Atacar cuerpo a cuerpo pisando barro. Atacar a distancia a un objetivo enzarzado en combate cuerpo a cuerpo. Luchar de noche.'],
        ['−1', 'Objetivo oculto por lluvia, niebla o humo. Luchar con poca luz.'],
        ['0', 'Circunstancias normales.'],
        ['+1', 'Atacar desde terreno elevado. Objetivo tumbado en el suelo. El bando atacante supera al defensor en proporción de 2 a 1.'],
        ['+2', 'El bando atacante supera al defensor en proporción de 3 a 1. Objetivo borracho.'],
        ['+3', 'Objetivo desprevenido.'],
      ],
      note: 'Los modificadores de circunstancias deberían oscilar normalmente entre 1 y 3.',
      source: N('Capítulo 2: Tiradas de ataque y circunstancias', 21),
    }),
    table({
      id: 'categorias-de-peligro',
      name: 'Categorías de peligro',
      columns: ['Categoría', 'Daño'],
      rows: [['Peligro menor', '1d6'], ['Peligro moderado', '2d6'], ['Peligro considerable', '3d6'], ['Peligro tremendo', '4d6'], ['Peligro extremo', '5d6'], ['Peligro mortal', '6d6']],
      note: 'Una tirada de atributo superada suele reducir el daño a la mitad (redondeando hacia abajo). Si la armadura no protege contra el peligro, el daño es penetrante.',
      source: N('Capítulo 2: Peligros del entorno', 24),
    }),
    table({
      id: 'recompensas-de-experiencia',
      name: 'Recompensas de experiencia por encuentro',
      columns: ['Encuentro', 'Recompensa por PJ'],
      rows: [['Rutinario', '0 PE'], ['Fácil', '100 PE'], ['Moderado', '200 PE'], ['Difícil', '300 PE']],
      note: 'Experiencia adicional: por norma, no más de 300 PE por una aventura y 500 PE por un arco argumental de varias aventuras. Por buena interpretación, 100 PE por jugador y partida.',
      source: N('Capítulo 4: Cálculo de recompensas en PE', 38),
    }),
    table({
      id: 'categorias-de-tesoro',
      name: 'Categorías de tesoro',
      columns: ['Categoría', 'Valor'],
      rows: [['Insignificante', '1d6 monedas de plata'], ['Escaso', '3d6 monedas de plata'], ['Moderado', '2d6 × 10 monedas de plata'], ['Considerable', '2d6 × 100 monedas de plata'], ['Abundante', '4d6 × 100 monedas de plata'], ['Grandioso', '6d6 × 100 monedas de plata']],
      note: 'El tesoro puede estar compuesto por monedas de distintas denominaciones, joyas, piedras preciosas y artículos similares.',
      source: N('Capítulo 4: Tesoros', 39),
    }),
  ],
  'tablas-dm',
);

/** Concentraciones que solo usan las criaturas (catálogo abierto): no figuran en la lista de PJ. */
export const CREATURE_FOCI: Focus[] = z.array(FocusSchema).parse(
  [
    { attribute: 'destreza', name: 'Mordisco' },
    { attribute: 'fuerza', name: 'Garras' },
    { attribute: 'fuerza', name: 'Cornada' },
    { attribute: 'percepcion', name: 'Tacto' },
    { attribute: 'percepcion', name: 'Gusto' },
  ].map((f) => ({ ...f, kind: 'creature', source: N('Capítulo 3: Adversarios', 26), audience: 'dm' })),
);
