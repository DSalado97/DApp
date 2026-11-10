import { StuntSchema, parseCatalog, type Stunt } from '../schemas';

const COMBATE = { book: 'jugador', section: 'Capítulo 6: Proezas de combate básicas', page: 61 } as const;
const MAGIA = { book: 'jugador', section: 'Capítulo 5: Proezas mágicas básicas' } as const;

type Raw = Pick<Stunt, 'id' | 'name' | 'cost' | 'effect'> & Partial<Pick<Stunt, 'variable' | 'maxCost' | 'oncePerRound' | 'noExtraPoints'>>;
const combat = (s: Raw) => ({ kind: 'combate', audience: 'player', aliases: [], source: COMBATE, oncePerRound: true, variable: false, noExtraPoints: false, ...s });
const magic = (s: Raw) => ({ kind: 'magia', audience: 'player', aliases: [], source: MAGIA, oncePerRound: true, variable: false, noExtraPoints: false, ...s });

/**
 * Proezas básicas. Con una tirada de ataque (o de hechizo) con éxito y dobles en dos dados cualesquiera se reciben
 * tantos PP como el dado dragón. Cada proeza, una vez por asalto (errata): la excepción es Hostigar.
 */
export const STUNTS: Stunt[] = parseCatalog(
  StuntSchema,
  [
    combat({ id: 'hostigar', name: 'Hostigar', cost: 1, variable: true, oncePerRound: false, effect: 'Desplazas al objetivo del ataque, o a ti mismo, 2 metros en cualquier dirección por cada PP gastado. Puede repetirse mientras haya PP.' }),
    combat({ id: 'recarga-rapida', name: 'Recarga rápida', cost: 1, effect: 'Recargas de inmediato un arma de proyectiles.' }),
    combat({ id: 'atravesar-armadura', name: 'Atravesar armadura', cost: 2, effect: 'Encuentras un hueco en la armadura: su valor se reduce a la mitad (redondeando hacia abajo) contra este ataque.' }),
    combat({ id: 'derribo', name: 'Derribo', cost: 2, effect: 'El enemigo queda tumbado en el suelo. Todo ataque cuerpo a cuerpo contra un enemigo derribado recibe +1 a la tirada de ataque.' }),
    combat({ id: 'desarmar', name: 'Desarmar', cost: 2, effect: 'Tirada de ataque enfrentada (que no genera PP). Si ganas, el adversario pierde el arma, que cae a 1d6 + Fuerza metros en la dirección que elijas.' }),
    combat({ id: 'golpe-poderoso', name: 'Golpe poderoso', cost: 2, effect: 'El ataque inflige 1d6 puntos de daño adicionales.' }),
    combat({ id: 'postura-defensiva', name: 'Postura defensiva', cost: 2, effect: 'Adoptas una postura de guardia: +2 a la Defensa hasta el comienzo de tu próximo turno.' }),
    combat({ id: 'ataque-relampago', name: 'Ataque relámpago', cost: 3, noExtraPoints: true, effect: 'Segundo ataque contra el mismo enemigo u otro que veas y esté a tu alcance. Un ataque a distancia exige un arma de proyectiles ya cargada. Si sacas dobles en esta tirada no recibes PP adicionales.' }),
    combat({ id: 'golpe-doble', name: 'Golpe doble', cost: 4, effect: 'El ataque afecta a dos objetivos: el secundario debe estar adyacente (cuerpo a cuerpo) o a 6 metros o menos del principal (proyectiles). Se aplica el resultado de la tirada original al secundario; si lo alcanza, sufre el daño habitual.' }),
    combat({ id: 'tomar-la-iniciativa', name: 'Tomar la iniciativa', cost: 4, effect: 'Pasas al primer puesto del orden de iniciativa y puedes jugar otro turno antes de que otros vuelvan a actuar; sigues primero hasta que otro te lo arrebate.' }),
    magic({ id: 'lanzamiento-energico', name: 'Lanzamiento enérgico', cost: 1, variable: true, maxCost: 3, effect: 'Aumenta en 1 la Potencia mágica del hechizo por cada PP gastado, hasta un máximo de 3.' }),
    magic({ id: 'lanzamiento-habil', name: 'Lanzamiento hábil', cost: 2, effect: 'Reduce en 1 el coste en Maná del hechizo; puede reducirlo a 0 PM.' }),
    magic({ id: 'hechizo-potente', name: 'Hechizo potente', cost: 2, effect: 'Si el hechizo inflige daño, uno de sus objetivos (a elección del mago) recibe 1d6 puntos de daño adicionales.' }),
    magic({ id: 'escudo-de-mana', name: 'Escudo de maná', cost: 3, effect: 'Usas el maná residual para erigir un escudo temporal: +2 a la Defensa hasta el comienzo de tu próximo turno.' }),
    magic({ id: 'lanzamiento-rapido', name: 'Lanzamiento rápido', cost: 4, noExtraPoints: true, effect: 'Tras resolver el hechizo, lanzas otro de inmediato, cuya preparación sea de una acción mayor o menor. Si sacas dobles en el segundo no recibes PP adicionales.' }),
    magic({ id: 'hechizo-imponente', name: 'Hechizo imponente', cost: 4, effect: 'Hasta el comienzo de tu próximo turno, quien intente un ataque cuerpo a cuerpo contra ti debe superar Voluntad (Coraje) contra NO 10 + tu Magia; si falla, debe realizar una acción de movimiento o de defender en lugar de atacarte.' }),
  ],
  'proezas',
);
