import { ConditionSchema, parseCatalog, type Condition } from '../schemas';

const J = (section: string, page: number) => ({ book: 'jugador', section, page }) as const;

/**
 * Catálogo de estados. Ni el compendio ni los manuales dan una lista oficial: aquí solo figuran los que las
 * fuentes describen con efecto concreto (derribado, inmovilizado, paralizado, inconsciente y moribundo).
 * Cualquier otro efecto es un «efecto libre del DJ» (`FREE_EFFECT_ID`), que no se interpreta mecánicamente.
 */
export const CONDITIONS: Condition[] = parseCatalog(
  ConditionSchema,
  [
    {
      id: 'derribado',
      name: 'Derribado',
      aliases: ['Tumbado', 'Tumbada'],
      audience: 'player',
      source: J('Capítulo 6: Proeza Derribo; Acciones de combate', 61),
      summary: 'Tumbado en el suelo. Los ataques cuerpo a cuerpo contra él reciben +1; para levantarse hace falta una acción de movimiento (media Velocidad) y no puede correr.',
      mechanics: { meleeAttackBonusAgainst: 1 },
    },
    {
      id: 'inmovilizado',
      name: 'Inmovilizado',
      aliases: [],
      audience: 'player',
      source: { book: 'narrador', section: 'Capítulo 3: Adversarios (Telaraña)', page: 27 },
      summary: 'Atrapado e incapaz de moverse (por ejemplo, por una telaraña). Liberarse exige una acción mayor y una tirada, y es la única acción que puede realizar; un aliado también puede intentarlo.',
      mechanics: {},
    },
    {
      id: 'paralizado',
      name: 'Paralizado',
      aliases: [],
      audience: 'player',
      source: { book: 'jugador', section: 'Capítulo 5: Glifo de Parálisis' },
      summary: 'No puede realizar ninguna acción y su Defensa baja a 7.',
      mechanics: { defenseOverride: 7, noActions: true },
    },
    {
      id: 'inconsciente',
      name: 'Inconsciente',
      aliases: [],
      audience: 'player',
      source: J('Capítulo 6: Contener golpes mortales y rematar', 60),
      summary: 'Quien asesta un golpe mortal puede contenerlo y dejar al objetivo inconsciente con 1 de Salud; vuelve en sí en 2d6 minutos. Un inconsciente puede ser rematado con un golpe de gracia.',
      mechanics: { noActions: true },
    },
    {
      id: 'moribundo',
      name: 'Moribundo',
      aliases: [],
      audience: 'player',
      source: J('Capítulo 6: Muerte de personajes', 60),
      summary: 'Un PJ a 0 de Salud muere tras 2 + Constitución asaltos, al comienzo de su turno en el último, salvo que reciba curación. Puede hablar, pero no realizar otras acciones. Un enemigo adyacente puede darle un golpe de gracia (acción mayor, muerte automática); a distancia exige un ataque contra Defensa 10.',
      mechanics: { noActions: true },
    },
  ],
  'estados',
);

/** Marca para efectos que no están en el catálogo: el DJ los gestiona a mano. */
export const FREE_EFFECT_ID = 'efecto-libre-del-dj';
export const FREE_EFFECT_LABEL = 'Efecto libre del DJ';
