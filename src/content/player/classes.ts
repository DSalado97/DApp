import { ClassDefinitionSchema, parseCatalog, type ClassDefinition } from '../schemas';

const src = (section: string, page: number) => ({ book: 'jugador', section, page }) as const;
const f = (id: string, name: string, text: string, stuntCosts: { stuntId: string; cost: number }[] = []) => ({ id, name, text, stuntCosts });

const COMMON_GEAR = ['Una mochila.', 'Ropa de viaje.', 'Un odre.'];
const AMMO_GEAR = 'Si escoges un arco o una ballesta como arma, recibes también un carcaj con 20 flechas o virotes.';
const SHIELD_GEAR = 'Si posees el talento Combate con arma y escudo, recibes también un escudo mediano.';

const talentLevel3and5 = (level: 3 | 5) => ({
  level,
  features: [f(`talento-adicional-${level}`, 'Talento adicional', 'El personaje adquiere 1 talento nuevo como Aprendiz, o bien mejora en un rango otro que ya posea.')],
});

/** Las tres clases de la Caja Básica, niveles 1 a 5 (Manual del Jugador, capítulo 2). */
export const CLASSES_DATA: ClassDefinition[] = parseCatalog(
  ClassDefinitionSchema,
  [
    {
      id: 'guerrero',
      name: 'Guerrero',
      aliases: [],
      source: src('Capítulo 2: Clases — Guerrero', 27),
      audience: 'player',
      summary: 'Especialista en combate directo: primera línea, armaduras pesadas y más grupos de armas que ninguna otra clase.',
      primaryAttributes: ['constitucion', 'destreza', 'fuerza'],
      secondaryAttributes: ['astucia', 'comunicacion', 'magia', 'percepcion', 'voluntad'],
      baseHealth: 30,
      weaponGroups: {
        fixed: ['pelea'],
        choose: { count: 3, from: ['arcos', 'contundentes', 'bastones', 'hachas', 'hojas-ligeras', 'hojas-pesadas', 'lanzas'] },
      },
      startingEquipment: [...COMMON_GEAR, 'Una armadura de cuero pesada y tres armas de los grupos que domina.', AMMO_GEAR, SHIELD_GEAR],
      levels: [
        {
          level: 1,
          features: [
            f('talentos-iniciales', 'Talentos iniciales', 'Dos de los siguientes talentos con rango de Aprendiz: Arquería, Combate con arma y escudo, Combate con armas a dos manos, Combate con armas arrojadizas, Combate con dos armas o Combate con un arma.'),
            f('entrenamiento-armaduras-aprendiz', 'Entrenamiento con armaduras', 'Recibe Entrenamiento con armaduras con rango de Aprendiz.'),
          ],
        },
        { level: 2, features: [f('concentracion-adicional', 'Concentración adicional', 'Una de las siguientes concentraciones: Astucia (Saber militar), Destreza (Montar) o Fuerza (Trepar).')] },
        talentLevel3and5(3),
        {
          level: 4,
          features: [
            f('bonificacion-proezas', 'Bonificación a proezas', 'Puedes llevar a cabo la proeza Golpe doble por 3 PP en lugar de los 4 habituales.', [{ stuntId: 'golpe-doble', cost: 3 }]),
            f('grupo-armas-adicional', 'Grupo de armas adicional', 'El personaje aprende a manejar un nuevo grupo de armas de su elección.'),
          ],
        },
        talentLevel3and5(5),
      ],
    },
    {
      id: 'mago',
      name: 'Mago',
      aliases: [],
      source: src('Capítulo 2: Clases — Mago', 28),
      audience: 'player',
      summary: 'Manipula el maná para lanzar hechizos: muy versátil, vulnerable en el cuerpo a cuerpo y penalizado si lleva armadura.',
      primaryAttributes: ['astucia', 'magia', 'voluntad'],
      secondaryAttributes: ['comunicacion', 'constitucion', 'destreza', 'fuerza', 'percepcion'],
      baseHealth: 20,
      startingMana: { base: 10, perLevelAttribute: 'magia' },
      weaponGroups: { fixed: ['bastones', 'pelea'] },
      startingEquipment: [...COMMON_GEAR, 'Un arma y una varita (para las lanzas arcanas).', AMMO_GEAR, SHIELD_GEAR],
      levels: [
        {
          level: 1,
          features: [
            f('adiestramiento-magico', 'Adiestramiento mágico', 'Otorga 3 hechizos iniciales, entre los de la Caja Básica. Más adelante se adquieren por talentos y aptitudes de clase.'),
            f('lanza-arcana', 'Lanza arcana', 'Ataque especial a distancia canalizado a través de un bastón o una varita: tirada de Magia (Lanza arcana), alcance de 16 metros, daño 1d6 + Magia. No cuesta Maná.'),
            f('talento-inicial-mago', 'Talento inicial', 'Aprendiz en uno de los siguientes talentos: Erudición, Lingüística o Quirurgía.'),
            f('puntos-de-mana', 'Puntos de Maná', 'Empieza con 10 + Magia + 1d6 puntos de Maná y gana Magia + 1d6 más cada nivel.'),
          ],
        },
        { level: 2, features: [f('hechizo-adicional-2', 'Hechizo adicional', 'El personaje aprende 1 hechizo nuevo.')] },
        talentLevel3and5(3),
        {
          level: 4,
          features: [
            f('hechizo-adicional-4', 'Hechizo adicional', 'El personaje aprende 1 hechizo nuevo.'),
            f('lanza-sortilega', 'Lanza sortílega', 'Tras alcanzar a un enemigo con una lanza arcana, puede lanzar un hechizo de coste máximo 3 PM como proeza de 3 PP, con su tirada de hechizo normal.'),
          ],
        },
        talentLevel3and5(5),
      ],
    },
    {
      id: 'picaro',
      name: 'Pícaro',
      aliases: ['Pícara'],
      source: src('Capítulo 2: Clases — Pícaro', 29),
      audience: 'player',
      summary: 'Especialista en sigilo, iniciativa, exploración y ataques oportunistas; la clase más flexible.',
      primaryAttributes: ['comunicacion', 'destreza', 'percepcion'],
      secondaryAttributes: ['astucia', 'constitucion', 'fuerza', 'magia', 'voluntad'],
      baseHealth: 25,
      weaponGroups: { fixed: ['arcos', 'bastones', 'hojas-ligeras', 'pelea'] },
      startingEquipment: [...COMMON_GEAR, 'Una armadura de cuero ligera y dos armas de los grupos que domina.', AMMO_GEAR, SHIELD_GEAR],
      levels: [
        {
          level: 1,
          features: [
            f('armadura-de-picaro', 'Armadura de pícaro', 'Ignora por completo la penalización de las armaduras de cuero: no afectan a su Velocidad ni a su Destreza.'),
            f('punalada', 'Puñalada', 'Tras acercarse con una acción de movimiento y superar una tirada enfrentada de Destreza (Sigilo) contra Percepción (Ver), usa su acción mayor para un ataque cuerpo a cuerpo con +2 a la tirada y +1d6 de daño. No sirve contra un enemigo que estuviera adyacente al comienzo de su turno (salvo con Amago, nivel 4).'),
            f('talento-inicial-picaro', 'Talento inicial', 'Aprendiz en uno de los siguientes talentos: Contactos, Exploración o Robo.'),
          ],
        },
        { level: 2, features: [f('bonificacion-proezas', 'Bonificación a proezas', 'Puedes llevar a cabo la proeza Atravesar armadura por 1 PP en lugar de 2.', [{ stuntId: 'atravesar-armadura', cost: 1 }])] },
        talentLevel3and5(3),
        { level: 4, features: [f('amago', 'Amago', 'Puede intentar una Puñalada contra un adversario que estuviera adyacente al inicio del turno. Primero gasta una acción menor en una tirada enfrentada de Comunicación (Engaño) contra la Voluntad (Disciplina) del adversario; si vence, ataca cuerpo a cuerpo con +2 y +1d6 de daño.')] },
        talentLevel3and5(5),
      ],
    },
  ],
  'clases',
);

/** Experiencia total necesaria para cada nivel (tabla «Progresión de niveles»). */
export const LEVEL_TABLE: { level: number; xpMin: number; xpMax: number }[] = [
  { level: 1, xpMin: 0, xpMax: 1999 },
  { level: 2, xpMin: 2000, xpMax: 4499 },
  { level: 3, xpMin: 4500, xpMax: 7499 },
  { level: 4, xpMin: 7500, xpMax: 10999 },
  { level: 5, xpMin: 11000, xpMax: 14999 },
];
