import type { Permission } from './modules';
import { useSession, type KeyState } from './session';

/** `null` = Modo Jugador (sin llave). Un permiso de DJ solo se concede con una credencial firmada válida. */
export function keyPermits(key: KeyState, required: Permission | null): boolean {
  return required === null || (key.status === 'valid' && key.claims.permissions.includes(required));
}

export function hasPermission(required: Permission | null): boolean {
  return keyPermits(useSession.getState().key, required);
}

export function usePermission(required: Permission | null): boolean {
  return useSession((s) => keyPermits(s.key, required));
}

/** ¿Puede entrar en el Modo DJ? Una llave válida da acceso al Modo DJ y sigue permitiendo el Modo Jugador. */
export function useHasDmAccess(): boolean {
  return useSession((s) => s.key.status === 'valid');
}
