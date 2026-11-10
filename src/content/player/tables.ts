import { TableSchema, parseCatalog, type GameTable } from '../schemas';

const J = (section: string, page: number) => ({ book: 'jugador', section, page }) as const;

const table = (t: Omit<GameTable, 'audience'>) => ({ audience: 'player', ...t });

/** Tablas del Manual del Jugador que el motor y la interfaz consultan. */
export const PLAYER_TABLES: GameTable[] = parseCatalog(
  TableSchema,
  [
    table({
      id: 'calculo-de-atributos',
      name: 'Cálculo de atributos',
      columns: ['3d6', 'Valor inicial'],
      rows: [['3', '−2'], ['4–5', '−1'], ['6–8', '0'], ['9–11', '+1'], ['12–14', '+2'], ['15–17', '+3'], ['18', '+4']],
      note: 'Ocho tiradas de 3d6, una por atributo, empezando por Astucia y siguiendo el orden de la hoja (Astucia, Comunicación, Constitución, Destreza, Fuerza, Magia, Percepción, Voluntad). Después se pueden intercambiar los valores de dos atributos.',
      source: J('Capítulo 2: Cálculo de atributos', 19),
    }),
    table({
      id: 'dificultad-tiradas-basicas',
      name: 'Dificultad de tiradas básicas',
      columns: ['Dificultad', 'Número objetivo'],
      rows: [['Rutina', '7'], ['Fácil', '9'], ['Moderada', '11'], ['Desafiante', '13'], ['Difícil', '15'], ['Formidable', '17'], ['Abrumadora', '19'], ['Casi imposible', '21']],
      source: J('Capítulo 6: Dificultad de las tiradas básicas', 56),
    }),
    table({
      id: 'tiradas-avanzadas',
      name: 'Umbrales de éxito de las tiradas avanzadas',
      columns: ['Dificultad', 'Umbral de éxito'],
      rows: [['Fácil', '5'], ['Moderada', '10'], ['Desafiante', '15'], ['Difícil', '20'], ['Formidable', '25']],
      note: 'Cada tirada superada suma el dado dragón al progreso; los fallos no suman. No conviene fijar umbrales superiores a 25.',
      source: { book: 'narrador', section: 'Capítulo 2: Tiradas avanzadas', page: 18 },
    }),
    table({
      id: 'progresion-de-niveles',
      name: 'Progresión de niveles',
      columns: ['PE totales', 'Nivel'],
      rows: [['0–1.999', '1'], ['2.000–4.499', '2'], ['4.500–7.499', '3'], ['7.500–10.999', '4'], ['11.000–14.999', '5']],
      source: J('Capítulo 2: Subida de nivel', 26),
    }),
    table({
      id: 'velocidad-por-raza',
      name: 'Velocidad base por raza',
      columns: ['Raza', 'Velocidad'],
      rows: [['Enano', '8 + Destreza'], ['Humano', '10 + Destreza'], ['Elfo', '12 + Destreza']],
      note: 'Se resta la penalización de la armadura: con entrenamiento afecta a la Velocidad; sin él, a la Destreza (y por tanto también a la Velocidad).',
      source: J('Capítulo 2: Defensa y Velocidad', 30),
    }),
    table({
      id: 'hechizos-con-armadura',
      name: 'Hechizos con armadura',
      columns: ['Armadura', 'Maná adicional por hechizo'],
      rows: [['Cuero ligera', '1'], ['Cuero pesada', '2'], ['Malla ligera', '3'], ['Malla pesada', '4'], ['Coraza ligera', '5'], ['Coraza pesada', '6']],
      note: 'No es la penalización de Velocidad/Destreza de la armadura: es un coste extra de Maná por cada hechizo.',
      source: J('Capítulo 5: Hechizos y armaduras', 48),
    }),
    table({
      id: 'monedas',
      name: 'Monedas',
      columns: ['Moneda', 'Equivalencia'],
      rows: [['1 de oro (soberano)', '100 de plata (mp)'], ['1 de plata (mp)', '100 de cobre (mc)'], ['1 de oro', '10.000 de cobre']],
      source: J('Capítulo 4: Divisas', 39),
    }),
    table({
      id: 'recuperacion',
      name: 'Recuperación de Salud y Maná',
      columns: ['Situación', 'Recuperación'],
      rows: [
        ['Primeros auxilios (NO 11, Astucia (Curación))', 'Dado dragón + Astucia del sanador (solo hasta nuevo daño)'],
        ['Respiro de cinco minutos tras un encuentro', '5 + Constitución + nivel (no si se terminó a 0 de Salud)'],
        ['Al menos 6 horas de sueño', '10 + Constitución + nivel'],
        ['Hora completa de descanso o meditación (Maná)', '1d6 + Magia'],
        ['8 horas seguidas de reposo (Maná)', 'Todo el Maná'],
      ],
      source: J('Capítulo 6: Salud y curación; Capítulo 5: Recuperación de Maná', 62),
    }),
  ],
  'tablas',
);
