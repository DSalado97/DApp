import { z } from 'zod';
import type { AttributeId } from '@/rules/types';
import { FocusSchema, type Focus } from '../schemas';

const source = { book: 'jugador', section: 'Capítulo 2: Concentraciones de atributos', page: 19 } as const;

const PLAYER_FOCI: Record<AttributeId, readonly string[]> = {
  astucia: ['Cartografía', 'Curación', 'Escritura', 'Heráldica', 'Ingeniería', 'Investigación', 'Navegación', 'Saber arcano', 'Saber cultural', 'Saber de la naturaleza', 'Saber histórico', 'Saber militar', 'Saber musical', 'Saber religioso', 'Tasación'],
  comunicacion: ['Actuación', 'Disfraz', 'Engaño', 'Etiqueta', 'Indagar', 'Juego', 'Liderazgo', 'Manejo de animales', 'Negociación', 'Persuasión', 'Seducción'],
  constitucion: ['Beber alcohol', 'Correr', 'Nadar', 'Remar', 'Vigor'],
  destreza: ['Acrobacia', 'Arcos', 'Bastones', 'Caligrafía', 'Forzar cerraduras', 'Hojas ligeras', 'Iniciativa', 'Juegos de manos', 'Montar', 'Pelea', 'Sigilo', 'Trampas'],
  fuerza: ['Armas contundentes', 'Conducir', 'Fortaleza', 'Hachas', 'Hojas pesadas', 'Intimidación', 'Lanzas', 'Saltar', 'Trepar'],
  magia: ['Creación', 'Entropía', 'Espiritual', 'Lanza arcana', 'Primordial'],
  percepcion: ['Buscar', 'Empatía', 'Oír', 'Olfato', 'Rastrear', 'Ver'],
  voluntad: ['Coraje', 'Disciplina', 'Fe', 'Moral'],
};

const WEAPON_FOCI = new Set(['Arcos', 'Bastones', 'Hojas ligeras', 'Pelea', 'Armas contundentes', 'Hachas', 'Hojas pesadas', 'Lanzas']);
const SCHOOL_FOCI = new Set(['Creación', 'Entropía', 'Espiritual', 'Primordial']);

/** Concentraciones de la Caja Básica para personajes (67). */
export const FOCI: Focus[] = z.array(FocusSchema).parse(
  (Object.entries(PLAYER_FOCI) as [AttributeId, readonly string[]][]).flatMap(([attribute, names]) =>
    names.map((name) => ({
      attribute,
      name,
      kind: attribute === 'magia' ? (SCHOOL_FOCI.has(name) ? 'school' : 'general') : WEAPON_FOCI.has(name) ? 'weapon' : 'general',
      source,
      audience: 'player',
    })),
  ),
);

export const focusKey = (attribute: AttributeId, name: string) => `${attribute}:${name}`;
