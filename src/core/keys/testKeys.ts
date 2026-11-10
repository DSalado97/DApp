/** Par de claves FIJO solo para tests (nunca se confía en él fuera de ellos). */
import { bytesToHex, encodeDageKey, hexToBytes, publicKeyOf, type NewKeyClaims } from './dagekey';

export const TEST_SECRET = hexToBytes('11'.repeat(32));
export const TEST_PUBLIC_HEX = bytesToHex(publicKeyOf(TEST_SECRET));

export const issueTestKey = (claims: Omit<NewKeyClaims, 'authId'>, keyId = 1) =>
  encodeDageKey({ authId: 'test-auth', ...claims }, keyId, TEST_SECRET);
