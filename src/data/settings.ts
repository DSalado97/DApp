import { getDb } from './db';
import { DEFAULT_SETTINGS, touchProfile } from './profiles';
import type { SettingsRow } from './types';

const table = () => getDb().table<SettingsRow, string>('settings');

export async function getSettings(profileId: string): Promise<SettingsRow> {
  return (await table().get(profileId)) ?? { ownerProfileId: profileId, ...DEFAULT_SETTINGS };
}

export async function updateSettings(
  profileId: string,
  patch: Partial<Pick<SettingsRow, 'textScale' | 'backupReminderDays'>>,
): Promise<SettingsRow> {
  const db = getDb();
  return db.transaction('rw', db.table('settings'), db.table('profiles'), async () => {
    const next = { ...(await getSettings(profileId)), ...patch };
    await table().put(next);
    await touchProfile(profileId);
    return next;
  });
}

/** Anota la última copia de seguridad. No cambia la revisión: acabar de exportar no hace "más nuevo" al perfil. */
export async function markBackup(profileId: string, when = new Date()): Promise<void> {
  const current = await getSettings(profileId);
  await table().put({ ...current, lastBackupAt: when.toISOString() });
}
