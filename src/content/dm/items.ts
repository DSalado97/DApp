import { MagicItemSchema, parseCatalog, type MagicItem } from '../schemas';

const N = (section: string, page = 40) => ({ book: 'narrador', section: `Capítulo 4: ${section}`, page }) as const;
const item = (i: Omit<MagicItem, 'audience' | 'aliases' | 'stuntCosts'> & Partial<Pick<MagicItem, 'aliases' | 'stuntCosts'>>) => ({
  audience: 'dm',
  aliases: [],
  stuntCosts: [],
  ...i,
});

/**
 * Objetos mágicos de niveles bajos (Manual del Narrador, capítulo 4). Nombres del manual; los del compendio quedan
 * como alias.
 */
export const MAGIC_ITEMS: MagicItem[] = parseCatalog(
  MagicItemSchema,
  [
    item({ id: 'piedra-brillante', name: 'Piedra brillante', aliases: ['Piedra luminosa'], kind: 'temporal', source: N('Objetos mágicos temporales'), effect: 'Creada por los tranquilos: refulge con la intensidad de un farol durante 2d6 meses.' }),
    item({ id: 'pocion-curativa-menor', name: 'Poción curativa menor', aliases: ['Poción menor de curación'], kind: 'temporal', source: N('Objetos mágicos temporales'), effect: 'Con una acción de activación, recupera 2d6 + Constitución puntos de Salud, sin superar el máximo.' }),
    item({ id: 'pocion-de-lirio-menor', name: 'Poción de lirio menor', aliases: ['Poción menor de lirio'], kind: 'temporal', source: N('Objetos mágicos temporales'), restriction: 'Solo un mago puede aprovecharla.', effect: 'Con una acción de activación, un mago recupera 1d6 + Magia puntos de Maná, sin superar el máximo.' }),
    item({ id: 'proyectil-mortifero', name: 'Proyectil mortífero', kind: 'temporal', source: N('Objetos mágicos temporales'), effect: 'Flecha o virote encantado: +2 al daño de un disparo. El encantamiento dura un solo disparo.' }),
    item({ id: 'proyectil-veloz', name: 'Proyectil veloz', kind: 'temporal', source: N('Objetos mágicos temporales'), effect: 'Flecha o virote encantado: +2 a la tirada de ataque de un disparo. El encantamiento dura un solo disparo.' }),
    item({ id: 'anillo-de-proteccion', name: 'Anillo de protección', aliases: ['Anillo de protección de escamas de dragón'], kind: 'permanente', source: N('Objetos mágicos permanentes'), restriction: 'Solo un mago puede utilizarlo.', effect: 'Anillo de hierro con un fragmento de escama de dragón: permite la proeza mágica Escudo de maná por 2 PP en lugar de 3.', stuntCosts: [{ stuntId: 'escudo-de-mana', cost: 2 }] }),
    item({ id: 'botas-de-forajido', name: 'Botas de forajido', aliases: ['Botas del forajido'], kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: 'El usuario no deja huellas: quien siga su rastro sufre −3 a sus tiradas de Percepción (Rastrear).' }),
    item({ id: 'capa-de-seda-de-arana', name: 'Capa de seda de araña', kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: '+2 a las tiradas de Destreza (Sigilo) e inmunidad a la aptitud Telaraña de las arañas gigantes.' }),
    item({ id: 'collar-de-la-doncella', name: 'Collar de la doncella', kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: '+1 a todas las tiradas de Comunicación (Persuasión) y (Seducción).' }),
    item({ id: 'cota-de-firmeza', name: 'Cota de firmeza', kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: 'Liviana cota de malla enana con placas pequeñas: valor de armadura 6 y penalización −1.' }),
    item({ id: 'espada-de-la-vibora', name: 'Espada de la Víbora', aliases: ['Espada de la serpiente'], kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: 'Espada corta: mientras se esgrime, el usuario se considera con la concentración Destreza (Iniciativa) y puede realizar Tomar la iniciativa por 3 PP en lugar de 4.', stuntCosts: [{ stuntId: 'tomar-la-iniciativa', cost: 3 }] }),
    item({ id: 'perdicion-del-cazador', name: 'Perdición del Cazador', aliases: ['Arco Perdición del Cazador'], kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: 'Arco largo con símbolos de Andruil: +1 a las tiradas de ataque y al daño.' }),
    item({ id: 'segadora-de-engendros', name: 'Segadora de Engendros', aliases: ['Hacha Segadora de Engendros'], kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: 'Hacha de batalla: +3 puntos de daño a engendros tenebrosos y criaturas corrompidas.' }),
    item({ id: 'tarja-de-herrero', name: 'Tarja de herrero', aliases: ['Tarja del herrero'], kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: 'Una vez al día, el propietario puede repetir una tirada de atributo, pero debe quedarse con el segundo resultado.' }),
    item({ id: 'yelmo-del-aguila', name: 'Yelmo del Águila', aliases: ['Yelmo del águila'], kind: 'permanente', source: N('Objetos mágicos permanentes'), effect: '+1 a todas las tiradas de Comunicación (Liderazgo) y Voluntad (Coraje).' }),
    item({ id: 'eslabon-de-la-ira', name: 'Eslabón de la Ira', kind: 'permanente', source: { book: 'narrador', section: 'La maldición dalishana: Eslabón de la Ira' }, effect: 'Todo portador reduce en 1 PP el coste de las proezas de combate que realice contra Mythallen; el poder residual también se manifiesta ante la araña gigante corrompida. Magia (Espiritual) NO 13 para reconocerlo.' }),
  ],
  'objetos-magicos',
);
