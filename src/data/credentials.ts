import { getDb } from './db';
import { base64ToBytes, bytesToBase64 } from './encoding';
import { touchProfile } from './profiles';
import type { CredentialRow } from './types';

const table = () => getDb().table<CredentialRow, string>('credentials');

/** Devuelve la credencial firmada tal como se guardó, o `null`. La validación criptográfica es de `core/keys`. */
export async function loadCredential(profileId: string): Promise<Uint8Array | null> {
  const row = await table().get(profileId);
  return row ? base64ToBytes(row.bytes) : null;
}

export async function saveCredential(profileId: string, bytes: Uint8Array): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.table('credentials'), db.table('profiles'), async () => {
    await table().put({ ownerProfileId: profileId, bytes: bytesToBase64(bytes), installedAt: new Date().toISOString() });
    await touchProfile(profileId);
  });
}

export async function removeCredential(profileId: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.table('credentials'), db.table('profiles'), async () => {
    await table().delete(profileId);
    await touchProfile(profileId);
  });
}
