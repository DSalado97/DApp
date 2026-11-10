/**
 * Clasificación explícita de cada sección del compendio (Fase 3). Sin imports: la consume el script
 * `tools/content/build-narrative.ts` (Node) y los tests.
 *
 * Regla del plan: capítulos 1 a 6, jugador; 8 a 11, DJ; en el 7, 7.1 a 7.8, 7.10 y 7.11 jugador, y el resto se
 * decide contrastando el manual de origen (aquí: 7.9, 7.12 y 7.14 pertenecen al Manual del Narrador, capítulo 2).
 * Los capítulos 12 y 13 no los fija el plan: ver `reason` de cada entrada.
 *
 * `excluded`: la sección está cubierta por datos estructurados y verificados contra los PDF (catálogos de `content/`);
 * mostrar también el texto del compendio duplicaría resultados y arrastraría sus erratas.
 */
export type SectionClass = 'player' | 'dm' | 'excluded';

export interface SectionRule {
  audience: SectionClass;
  /** Libro de origen que respalda la clasificación. */
  origin: 'compendio' | 'jugador' | 'narrador';
  reason?: string;
  /** Si la sección mezcla audiencias: índices de bloques (separados por línea en blanco) para la parte de jugador. */
  splitPlayerBlocks?: number[];
  /** Notas de corrección (docs/RULES_ERRATA.md) que se añaden al final del texto de la sección. */
  corrections?: string[];
}

const P = (reason?: string, corrections?: string[]): SectionRule => ({ audience: 'player', origin: 'jugador', ...(reason ? { reason } : {}), ...(corrections ? { corrections } : {}) });
const D = (reason?: string): SectionRule => ({ audience: 'dm', origin: 'narrador', ...(reason ? { reason } : {}) });
const X = (reason: string): SectionRule => ({ audience: 'excluded', origin: 'compendio', reason });

const STRUCTURED = 'Cubierta por datos estructurados verificados contra el PDF';

export const CHAPTER_TITLES: Record<string, string> = {
  '1': 'Conceptos básicos del juego',
  '2': 'Thedas y Ferelden: ambientación',
  '3': 'Creación y progresión de personajes',
  '4': 'Talentos y aptitudes',
  '5': 'Armas, armaduras y equipo',
  '6': 'Magia',
  '7': 'Reglas de juego',
  '8': 'Herramientas del Director de Juego',
  '9': 'Adversarios y criaturas',
  '10': 'Experiencia, recompensas y tesoros',
  '11': 'Aventura introductoria: La maldición dalishana',
  '12': 'Referencia rápida',
  '13': 'Glosario práctico',
};

export const SECTION_RULES: Record<string, SectionRule> = {
  // 1 · Conceptos básicos
  '1.1': P(), '1.2': P(), '1.3': P(),
  // 2 · Ambientación
  '2.1': P(), '2.2': P(), '2.3': P(), '2.4': P(), '2.5': P(), '2.6': P(), '2.7': P(), '2.8': P(), '2.9': P(), '2.10': P(), '2.11': P(), '2.12': P(),
  // 3 · Creación
  '3.1': P(),
  '3.2': P(undefined, ['El orden de generación es el de la hoja de personaje: Astucia, Comunicación, Constitución, Destreza, Fuerza, Magia, Percepción y Voluntad (Manual del Jugador, p. 18).']),
  '3.3': P(),
  '3.4': X(`${STRUCTURED}: trasfondos (content/player/backgrounds).`),
  '3.5': X(`${STRUCTURED}: clases (content/player/classes).`),
  '3.6': P(undefined, [
    'El mago recibe un arma y una varita (para sus lanzas arcanas). El talento Combate con arma y escudo proporciona un escudo mediano.',
    'El escudo «medio» del compendio es el escudo mediano del manual.',
    'La penalización de armadura se aplica a la Velocidad si se está entrenado en esa armadura; si no, a la Destreza (y por tanto también a la Velocidad y a la Defensa).',
  ]),
  '3.7': P(), '3.8': P(),
  // 4 · Talentos
  '4.1': P(),
  '4.2': X(`${STRUCTURED}: talentos (content/player/talents).`),
  // 5 · Equipo
  '5.1': P(),
  '5.2': X(`${STRUCTURED}: armaduras (content/player/equipment).`),
  '5.3': X(`${STRUCTURED}: armas (content/player/equipment); el compendio omite el Guantelete y el Puño y usa nombres distintos.`),
  '5.4': X(`${STRUCTURED}: escudos (content/player/equipment).`),
  '5.5': X(`${STRUCTURED}: equipo (content/player/equipment).`),
  '5.6': X(`${STRUCTURED}: servicios y transporte (content/player/equipment).`),
  // 6 · Magia
  '6.1': P(), '6.2': P(),
  '6.3': P(undefined, ['Potencia mágica = 10 + Magia + concentración de la escuela (+2) si la hay.']),
  '6.4': P(undefined, ['Cada proeza mágica concreta solo puede realizarse una vez por asalto.']),
  '6.5': X(`${STRUCTURED}: hechizos (content/player/spells).`),
  '6.6': P(),
  // 7 · Reglas de juego
  '7.1': P(), '7.2': P(), '7.3': P(), '7.4': P(), '7.5': P(),
  '7.6': P(undefined, [
    'La Salud nunca puede caer por debajo de 0. Un PJ moribundo muere al comienzo de su turno en el último asalto (2 + Constitución asaltos).',
    'Contener golpes mortales: quien asesta un golpe que mataría puede dejar al adversario inconsciente con 1 de Salud; vuelve en sí en 2d6 minutos.',
    'Rematar: un enemigo adyacente puede dar un golpe de gracia a un moribundo o inconsciente como acción mayor (muerte automática); a distancia exige un ataque contra Defensa 10.',
    'El respiro de cinco minutos no se puede tomar si el encuentro terminó con 0 de Salud.',
  ]),
  '7.7': P(),
  '7.8': P(undefined, ['Preparar: no se puede realizar si ya se ha hecho una acción mayor en el turno.']),
  '7.9': D('Modificadores al ataque: Manual del Narrador, capítulo 2.'),
  '7.10': P('Sorpresa figura en el Manual del Narrador, pero el plan fija 7.10 como jugador.', [
    'La iniciativa es Destreza (Iniciativa), con desempate por dado dragón y luego por atributo, y no se repite cada asalto. Quien se une al combate tira al comienzo del asalto en que aparece. Los PNJ principales tiran por separado; los secundarios, por grupos.',
  ]),
  '7.11': P(undefined, [
    'Cada proeza solo puede realizarse una vez por asalto; la excepción es Hostigar.',
    'Atravesar armadura reduce la armadura del objetivo a la mitad, redondeando hacia abajo.',
    'Desarmar: tirada de ataque enfrentada que no genera PP. Golpe doble: el objetivo secundario debe estar adyacente (cuerpo a cuerpo) o a 6 m o menos del principal (proyectiles).',
  ]),
  '7.12': D('Moral: Manual del Narrador, capítulo 2 (solo se aplica a PNJ).'),
  '7.13': {
    audience: 'dm',
    origin: 'narrador',
    reason: 'Mezcla el combate montado (Manual del Jugador, capítulo 6, parte jugador) con criaturas voladoras (Manual del Narrador, capítulo 2, parte DJ): se divide en dos.',
    splitPlayerBlocks: [0],
  },
  '7.14': D('Peligros del entorno: Manual del Narrador, capítulo 2.'),
  // 8–11 · DJ
  '8.1': D(), '8.2': D(), '8.3': D(), '8.4': D(), '8.5': D(), '8.6': D(), '8.7': D(), '8.8': D(), '8.9': D(), '8.10': D(),
  '9.1': D(), '9.2': D(), '9.3': D(), '9.4': D(),
  '9.5': X(`${STRUCTURED}: criaturas (content/dm/creatures).`),
  '9.6': D(),
  '10.1': D(),
  '10.2': X(`${STRUCTURED}: objetos mágicos (content/dm/items).`),
  '11.1': D(), '11.2': D(), '11.3': D(), '11.4': D(), '11.5': D(), '11.6': D(), '11.7': D(), '11.8': D(), '11.9': D(), '11.10': D(), '11.11': D(),
  '11.12': X(`${STRUCTURED}: PNJ y monstruos de la aventura (content/dm/npcs y creatures).`),
  // 12 · Referencia rápida (no fijada por el plan)
  '12.1': { audience: 'player', origin: 'jugador', reason: 'Fórmulas del Manual del Jugador.' },
  '12.2': { audience: 'player', origin: 'jugador', reason: 'Secuencia de ataque del Manual del Jugador (capítulo 6).' },
  '12.3': { audience: 'player', origin: 'jugador', reason: 'Secuencia de lanzamiento del Manual del Jugador (capítulo 5).' },
  '12.4': { audience: 'dm', origin: 'narrador', reason: 'Decisiones rápidas del DJ: Manual del Narrador.' },
  // 13 · Glosario (capítulo sin subsecciones)
  '13': { audience: 'player', origin: 'compendio', reason: 'Glosario de términos; las entradas que solo aparecen en la aventura (Vhenallin) pasan a la parte del DJ.' },
};

/** Entradas del glosario (filas de tabla) reservadas al DJ: aparecen en la aventura. */
export const GLOSSARY_DM_ROWS = [/^\|\s*Vhenallin\s*\|/];

/** Secciones que no son texto de juego y se saltan (portada del compendio, índice). */
export const SKIPPED_HEADINGS = ['ÍNDICE TEMÁTICO DE CONSULTA'];
