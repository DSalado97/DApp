import type { Permission } from './modules';

/**
 * Fase 1: todavía no existen perfiles ni llaves, así que ningún permiso de DJ está concedido.
 * La Fase 2 sustituye esta función por la verificación de la credencial firmada.
 */
export function hasPermission(required: Permission | null): boolean {
  return required === null;
}
