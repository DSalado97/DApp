import { encodeDageKey, hexToBytes } from '../src/core/keys/dagekey';

/** Clave privada SOLO de pruebas (keyId 255). Su pública solo está confiada en el build `--mode e2e`. */
const E2E_SECRET = 'cccc0df802fc48ce629a2e35860f1938d1d34b9090070c2446ecf5bd183ac0c8';

export function issueTestKey(profileId: string, opts: { expiresAt?: string } = {}): Buffer {
  return Buffer.from(
    encodeDageKey({ authId: 'e2e-test', profileId, ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}) }, 255, hexToBytes(E2E_SECRET)),
  );
}
