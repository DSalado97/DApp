import type { ArmorId } from '@/rules/types';
import {
  ArmorSchema,
  GearSchema,
  ShieldSchema,
  WeaponSchema,
  parseCatalog,
  type Armor,
  type Gear,
  type Shield,
  type Weapon,
} from '../schemas';

const J = (section: string, page: number) => ({ book: 'jugador', section, page }) as const;
const ARMAS = J('Capítulo 4: Armas', 42);
const ARMADURAS = J('Capítulo 4: Armaduras y escudos', 42);

type W = Omit<Weapon, 'audience' | 'source' | 'aliases' | 'twoHanded' | 'thrown' | 'id'> &
  Partial<Pick<Weapon, 'aliases' | 'twoHanded' | 'thrown' | 'source'>> & { id: string };
const weapon = (w: W) => ({ audience: 'player', source: ARMAS, aliases: [], twoHanded: false, thrown: false, ...w });

/**
 * Armas de la Caja Básica (24). Fuente: tabla de armas y alcances del Manual del Jugador (p. 42).
 * Los nombres siguen el manual; los del compendio quedan como alias (RULES_ERRATA).
 */
export const WEAPONS: Weapon[] = parseCatalog(
  WeaponSchema,
  [
    // Arcos (Destreza). Daño: Percepción en lugar de Fuerza.
    weapon({ id: 'arco-corto', name: 'Arco corto', group: 'arcos', damage: '1d6+1', minStrength: -1, price: 9, range: { short: 16, long: 32 }, reload: 'menor', description: 'También conocido como arco de jinete: más pequeño que un arco largo, pero más fácil de manejar.' }),
    weapon({ id: 'arco-largo', name: 'Arco largo', group: 'arcos', damage: '1d6+3', minStrength: 1, price: 15, range: { short: 26, long: 52 }, reload: 'menor', description: 'Gran arco, casi tan alto como un hombre, de una sola pieza de madera.' }),
    weapon({ id: 'ballesta', name: 'Ballesta', group: 'arcos', damage: '2d6+1', minStrength: 1, price: 20, range: { short: 30, long: 60 }, reload: 'mayor', description: 'Arco mecanizado sobre un asidero de madera con un manubrio para tensarlo.' }),
    // Armas contundentes (Fuerza)
    weapon({ id: 'maza', name: 'Maza', group: 'contundentes', damage: '2d6', minStrength: 1, price: 12, description: 'Arma roma pensada para aplastar armaduras: cabeza pesada de piedra o metal en un mango.' }),
    weapon({ id: 'mazo', name: 'Mazo', aliases: ['Martillo de guerra'], group: 'contundentes', damage: '1d6+3', minStrength: 1, price: 14, description: 'Martillo de mango largo de herrero o carpintero, usado en combate para machacar.' }),
    weapon({ id: 'mazo-dos-manos', name: 'Mazo a dos manos', aliases: ['Martillo a dos manos'], group: 'contundentes', damage: '2d6+3', minStrength: 3, price: 19, twoHanded: true, description: 'Recio mango de algo más de un metro coronado por una brutal cabeza de martillo metálica.' }),
    // Bastones (Destreza)
    weapon({ id: 'baculo', name: 'Báculo', aliases: ['Bastón'], group: 'bastones', damage: '1d6+1', minStrength: null, price: 3, description: 'Palo largo de madera, a veces con conteras de metal en los extremos.' }),
    weapon({ id: 'garrote', name: 'Garrote', group: 'bastones', damage: '1d6', minStrength: null, price: 1, description: 'Porra pequeña de madera recia o metal; incluye cachiporras y armas similares.' }),
    weapon({ id: 'lucero-del-alba', name: 'Lucero del alba', group: 'bastones', damage: '1d6+3', minStrength: 1, price: 11, description: 'Mango corto con una cabeza metálica erizada de pinchos, también llamada maza de armas.' }),
    // Hachas (Fuerza)
    weapon({ id: 'hacha-dos-manos', name: 'Hacha a dos manos', group: 'hachas', damage: '3d6', minStrength: 3, price: 20, twoHanded: true, description: 'Hermana mayor del hacha de batalla, de doble hoja o con hoja y pincho.' }),
    weapon({ id: 'hacha-arrojadiza', name: 'Hacha arrojadiza', group: 'hachas', damage: '1d6+2', minStrength: 1, price: 10, range: { short: 4, long: 8 }, reload: 'menor', thrown: true, description: 'Variante de combate del hacha de leñador, equilibrada para arrojarla.' }),
    weapon({ id: 'hacha-de-batalla', name: 'Hacha de batalla', group: 'hachas', damage: '2d6', minStrength: 1, price: 14, description: 'Hacha de hoja amplia y aspecto temible; algunas tienen dos hojas.' }),
    // Hojas ligeras (Destreza)
    weapon({ id: 'cuchillo-arrojadizo', name: 'Cuchillo arrojadizo', group: 'hojas-ligeras', damage: '1d6', minStrength: null, price: 10, range: { short: 6, long: 12 }, reload: 'menor', thrown: true, description: 'Parecido a la daga, pero más corto y equilibrado para arrojarlo.' }),
    weapon({ id: 'daga', name: 'Daga', group: 'hojas-ligeras', damage: '1d6+1', minStrength: null, price: 9, description: 'Cuchillo largo para apuñalar y dar estocadas; las más largas se llaman puñales.' }),
    weapon({ id: 'espada-corta', name: 'Espada corta', group: 'hojas-ligeras', damage: '1d6+2', minStrength: -1, price: 14, description: 'Hoja de una mano, más corta que la espada larga y mayor que la daga, para estocadas.' }),
    // Hojas pesadas (Fuerza)
    weapon({ id: 'espada-dos-manos', name: 'Espada a dos manos', aliases: ['Espadón'], group: 'hojas-pesadas', damage: '3d6', minStrength: 3, price: 23, twoHanded: true, description: 'Formidable hoja de entre metro y medio y dos metros que requiere ambas manos.' }),
    weapon({ id: 'espada-bastarda', name: 'Espada bastarda', group: 'hojas-pesadas', damage: '2d6+1', minStrength: 2, price: 20, description: 'Espada de mano y media: hoja y empuñadura más largas que las de la espada larga.' }),
    weapon({ id: 'espada-larga', name: 'Espada larga', group: 'hojas-pesadas', damage: '2d6', minStrength: 1, price: 18, description: 'Hoja de una mano y doble filo, de casi un metro; la más común.' }),
    // Lanzas (Fuerza)
    weapon({ id: 'lanza', name: 'Lanza', group: 'lanzas', damage: '1d6+3', minStrength: 0, price: 12, description: 'Mango de madera con una afilada punta de acero; arma de caza y de guerra.' }),
    weapon({ id: 'lanza-dos-manos', name: 'Lanza a dos manos', group: 'lanzas', damage: '2d6', minStrength: 1, price: 20, twoHanded: true, description: 'Lanza larga con punta de acero de gran tamaño y mango más largo de lo normal.' }),
    weapon({ id: 'lanza-arrojadiza', name: 'Lanza arrojadiza', aliases: ['Jabalina'], group: 'lanzas', damage: '1d6+3', minStrength: 0, price: 12, range: { short: 8, long: 16 }, reload: 'menor', thrown: true, description: 'Lanza ligera que puede arrojarse; incluye armas similares como la jabalina.' }),
    // Pelea (Destreza)
    weapon({ id: 'arma-improvisada', name: 'Arma improvisada', group: 'pelea', damage: '1d6-1', minStrength: null, price: null, description: 'Lo primero que se pilla: prácticamente cualquier objeto.' }),
    weapon({ id: 'guantelete', name: 'Guantelete', group: 'pelea', damage: '1d3+1', minStrength: null, price: 4, source: { ...ARMAS, section: 'Capítulo 4: Armas (omitido en el compendio)' }, description: 'Guante pesado de cuero, a veces reforzado con metal; incluye nudilleras y cestos.' }),
    weapon({ id: 'puno', name: 'Puño', aliases: ['Puñetazo'], group: 'pelea', damage: '1d3', minStrength: null, price: null, source: { ...ARMAS, section: 'Capítulo 4: Armas (omitido en el compendio)' }, description: 'Arma predilecta en las tabernas de Thedas.' }),
  ],
  'armas',
);

type A = Omit<Armor, 'audience' | 'source' | 'aliases' | 'id'> & { id: ArmorId; aliases?: string[] };
const armor = (a: A) => ({ audience: 'player', source: ARMADURAS, aliases: [], ...a });

/** Armaduras: valor de armadura, impedimento (penalización) y maná extra de hechizos (p. 42 y 48). */
export const ARMORS: Armor[] = parseCatalog(
  ArmorSchema,
  [
    armor({ id: 'cuero-ligera', name: 'Cuero ligera', category: 'cuero', armorValue: 3, impediment: 0, spellManaExtra: 1, price: 15, description: 'Muy común en Thedas: pieles gruesas, prendas enguatadas y armaduras acolchadas, flexibles sobre la ropa corriente.' }),
    armor({ id: 'cuero-pesada', name: 'Cuero pesada', category: 'cuero', armorValue: 4, impediment: 1, spellManaExtra: 2, price: 30, description: 'Cuero endurecido con petos, piezas dorsales y hombreras; a veces con remaches metálicos.' }),
    armor({ id: 'malla-ligera', name: 'Malla ligera', category: 'malla', armorValue: 5, impediment: 2, spellManaExtra: 3, price: 50, description: 'Armadura de anillas: aros metálicos entrelazados sobre cuero endurecido.' }),
    armor({ id: 'malla-pesada', name: 'Malla pesada', category: 'malla', armorValue: 7, impediment: 3, spellManaExtra: 4, price: 75, description: 'La tradicional cota de malla de pequeños eslabones, sobre una capa acolchada.' }),
    armor({ id: 'coraza-ligera', name: 'Coraza ligera', aliases: ['Placas ligeras', 'Armadura de semiplacas'], category: 'coraza', armorValue: 8, impediment: 4, spellManaExtra: 5, price: 100, description: 'Traje completo de malla pesada con peto y grebas de placas metálicas.' }),
    armor({ id: 'coraza-pesada', name: 'Coraza pesada', aliases: ['Placas pesadas'], category: 'coraza', armorValue: 10, impediment: 5, spellManaExtra: 6, price: 150, description: 'Arnés completo de placas superpuestas sobre un jubón acolchado; el peso se reparte por todo el cuerpo.' }),
  ],
  'armaduras',
);

type S = Omit<Shield, 'audience' | 'source' | 'aliases'> & { aliases?: string[] };
const shield = (s: S) => ({ audience: 'player', source: ARMADURAS, aliases: [], ...s });

/** Escudos. Sin Combate con arma y escudo, la bonificación máxima es +1. */
export const SHIELDS: Shield[] = parseCatalog(
  ShieldSchema,
  [
    shield({ id: 'escudo-ligero', name: 'Escudo ligero', aliases: ['Rodela'], defenseBonus: 1, price: 15, description: 'Escudo pequeño, casi siempre redondo y de madera.' }),
    shield({ id: 'escudo-mediano', name: 'Escudo mediano', aliases: ['Escudo medio'], defenseBonus: 2, price: 30, description: 'El más popular entre los guerreros: buena protección sin resultar engorroso.' }),
    shield({ id: 'escudo-pesado', name: 'Escudo pesado', defenseBonus: 3, price: 60, description: 'Escudo grande de la infantería pesada; exige un entrenamiento de soldado profesional.' }),
  ],
  'escudos',
);

const EQUIPO = J('Capítulo 4: Equipo de aventurero', 44);
const COMIDA = J('Capítulo 4: Comida, bebida y alojamiento', 45);
const ANIMALES = J('Capítulo 4: Animales, monturas y vehículos', 45);

type G = { id: string; name: string; aliases?: string[]; amount: number; coin: 'mp' | 'mc'; category: Gear['category']; description?: string };
const gear = (section: ReturnType<typeof J>) => (g: G) => ({
  id: g.id,
  name: g.name,
  aliases: g.aliases ?? [],
  category: g.category,
  price: { amount: g.amount, coin: g.coin },
  source: section,
  audience: 'player',
  ...(g.description ? { description: g.description } : {}),
});
const adv = gear(EQUIPO);
const serv = gear(COMIDA);
const anim = gear(ANIMALES);

/** Equipo, servicios y transporte con los nombres del manual (mc = moneda de cobre, mp = moneda de plata). */
export const GEAR: Gear[] = parseCatalog(
  GearSchema,
  [
    adv({ id: 'aceite', name: 'Aceite (medio litro)', amount: 8, coin: 'mc', category: 'aventurero', description: 'Combustible para lámparas y faroles; medio litro dura unas 6 horas.' }),
    adv({ id: 'antorcha', name: 'Antorcha', amount: 10, coin: 'mc', category: 'aventurero', description: 'Ilumina un radio de unos 6 metros y arde aproximadamente 1 hora.' }),
    adv({ id: 'bolsa-cinto', name: 'Bolsa para el cinto', aliases: ['Bolsa de cinturón'], amount: 1, coin: 'mp', category: 'aventurero' }),
    adv({ id: 'carcaj', name: 'Carcaj', amount: 2, coin: 'mp', category: 'aventurero', description: 'Sirve para guardar flechas o virotes.' }),
    adv({ id: 'cuerda', name: 'Cuerda (20 metros)', amount: 2, coin: 'mp', category: 'aventurero' }),
    adv({ id: 'equipo-curandero', name: 'Equipo de curandero', amount: 25, coin: 'mp', category: 'aventurero', description: 'Vendas, hierbas, ungüentos, pociones, cuchillos pequeños, aguja e hilo para tratar heridas.' }),
    adv({ id: 'escarpia', name: 'Escarpia', aliases: ['Pitón'], amount: 5, coin: 'mc', category: 'aventurero', description: 'Estaca de metal con un agujero para pasar la cuerda al escalar.' }),
    adv({ id: 'farol', name: 'Farol', aliases: ['Linterna'], amount: 5, coin: 'mp', category: 'aventurero', description: 'Lámpara con paneles de cristal; arde unas 6 horas e ilumina 10 metros.' }),
    adv({ id: 'flechas', name: 'Flechas (20)', amount: 2, coin: 'mp', category: 'aventurero', description: 'Munición para arcos.' }),
    adv({ id: 'frasco', name: 'Frasco', amount: 50, coin: 'mc', category: 'aventurero' }),
    adv({ id: 'ganzuas', name: 'Ganzúas', amount: 12, coin: 'mp', category: 'aventurero', description: 'Herramientas para manipular y forzar cerraduras.' }),
    adv({ id: 'instrumento-musical', name: 'Instrumento musical', amount: 10, coin: 'mp', category: 'aventurero' }),
    adv({ id: 'lampara', name: 'Lámpara', amount: 2, coin: 'mp', category: 'aventurero', description: 'Arde unas 6 horas con medio litro de aceite e ilumina 6 metros.' }),
    adv({ id: 'mochila', name: 'Mochila', amount: 9, coin: 'mp', category: 'aventurero' }),
    adv({ id: 'odre', name: 'Odre', amount: 40, coin: 'mc', category: 'aventurero' }),
    adv({ id: 'pedernal-acero', name: 'Pedernal y acero', amount: 10, coin: 'mc', category: 'aventurero' }),
    adv({ id: 'piedra-afilar', name: 'Piedra de afilar', amount: 10, coin: 'mc', category: 'aventurero' }),
    adv({ id: 'ropa-montana', name: 'Ropa de montaña', amount: 10, coin: 'mp', category: 'aventurero' }),
    adv({ id: 'ropa-viaje', name: 'Ropa de viaje', amount: 15, coin: 'mp', category: 'aventurero' }),
    adv({ id: 'tienda-grande', name: 'Tienda de campaña grande', aliases: ['Tienda grande'], amount: 35, coin: 'mp', category: 'aventurero', description: 'Hasta cuatro aventureros pueden dormir en ella.' }),
    adv({ id: 'tienda-pequena', name: 'Tienda de campaña pequeña', aliases: ['Tienda pequeña'], amount: 10, coin: 'mp', category: 'aventurero', description: 'Capacidad para una persona con armas y armadura.' }),
    adv({ id: 'tinta', name: 'Tinta (negra, un frasco)', aliases: ['Tinta'], amount: 20, coin: 'mc', category: 'aventurero' }),
    adv({ id: 'velas', name: 'Velas (un par)', aliases: ['Velas (par)'], amount: 5, coin: 'mc', category: 'aventurero', description: 'Cada vela ilumina un radio de 2 metros y arde 1 hora.' }),
    adv({ id: 'virotes', name: 'Virotes (20)', amount: 3, coin: 'mp', category: 'aventurero', description: 'Munición para ballestas.' }),
    serv({ id: 'habitacion-privada', name: 'Alojamiento en habitación privada (por noche)', aliases: ['Habitación privada por noche'], amount: 2, coin: 'mp', category: 'servicio' }),
    serv({ id: 'sala-comun', name: 'Alojamiento en sala común (por noche)', aliases: ['Sala común por noche'], amount: 50, coin: 'mc', category: 'servicio' }),
    serv({ id: 'vino-barato', name: 'Botella de vino barato', aliases: ['Vino barato'], amount: 20, coin: 'mc', category: 'servicio' }),
    serv({ id: 'cerveza', name: 'Cerveza (medio litro)', amount: 10, coin: 'mc', category: 'servicio' }),
    serv({ id: 'comida-posada', name: 'Comida en una posada', aliases: ['Comida en posada'], amount: 25, coin: 'mc', category: 'servicio' }),
    serv({ id: 'raciones-viaje', name: 'Raciones de viaje (1 semana)', aliases: ['Raciones de viaje (una semana)'], amount: 2, coin: 'mp', category: 'servicio' }),
    anim({ id: 'alforjas', name: 'Alforjas', amount: 10, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'caballo-monta', name: 'Caballo de monta', amount: 120, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'caballo-tiro', name: 'Caballo de tiro', amount: 50, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'carro', name: 'Carro', amount: 20, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'carromato', name: 'Carromato', aliases: ['Carreta'], amount: 150, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'establo', name: 'Establo (por día)', aliases: ['Establo por día'], amount: 10, coin: 'mc', category: 'animal-vehiculo' }),
    anim({ id: 'forraje', name: 'Forraje (ración diaria)', aliases: ['Forraje por día'], amount: 5, coin: 'mc', category: 'animal-vehiculo' }),
    anim({ id: 'halcon', name: 'Halcón', amount: 75, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'mula', name: 'Mula', amount: 20, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'perro', name: 'Perro', amount: 15, coin: 'mp', category: 'animal-vehiculo' }),
    anim({ id: 'silla-montar', name: 'Silla de montar', amount: 20, coin: 'mp', category: 'animal-vehiculo' }),
  ],
  'equipo',
);
