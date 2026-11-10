import type { TrustedKeys } from './dagekey';

/**
 * Mapa keyId → clave pública Ed25519 (hex). La clave privada vive FUERA del repositorio (ver docs/SECURITY.md).
 * Para rotar: genera otra pareja con `npm run keygen -- init --key <nuevoId>` y añade aquí su clave pública.
 */
const PRODUCTION_KEYS: TrustedKeys = {
  1: '8919e52d14164a4c6fb8bdca584b8a326e6dff25ade0e0df92930fc1ed2416cb',
};

/**
 * Clave solo para pruebas E2E (su privada está en e2e/test-key.ts). Se incluye únicamente en el build
 * `--mode e2e`; Vite elimina esta rama del build de producción.
 */
const E2E_KEYS: TrustedKeys = {
  255: '137665ad13c3f1b96ad41b40cbebef2b68e65dc259664785cbd082efa5344f86',
};

export const TRUSTED_KEYS: TrustedKeys = import.meta.env.MODE === 'e2e' ? { ...PRODUCTION_KEYS, ...E2E_KEYS } : PRODUCTION_KEYS;
