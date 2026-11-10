import { z } from 'zod';
import { getConfig, getDb } from './db';
import { newId } from './encoding';
import { deleteProfileRows } from './exchange/build';
import type { Profile, SettingsRow } from './types';

export const DEFAULT_SETTINGS = { textScale: 'normal', backupReminderDays: 7 } as const satisfies Omit<SettingsRow, 'ownerProfileId'>;

export const ProfileNameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(1, 'Escribe un nombre').max(40, 'Máximo 40 caracteres'));

export function parseProfileName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const r = ProfileNameSchema.safeParse(raw);
  return r.success ? { ok: true, name: r.data } : { ok: false, error: r.error.issues[0]?.message ?? 'Nombre no válido' };
}

const profilesTable = () => getDb().table<Profile, string>('profiles');

export async function listProfiles(): Promise<Profile[]> {
  const all = await profilesTable().toArray();
  return all.sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1));
}

export function getProfile(id: string): Promise<Profile | undefined> {
  return profilesTable().get(id);
}

export async function createProfile(rawName: string): Promise<Profile> {
  const parsed = parseProfileName(rawName);
  if (!parsed.ok) throw new Error(parsed.error);
  const db = getDb();
  return db.transaction('rw', db.table('profiles'), db.table('settings'), async () => {
    // createdAt estrictamente creciente: el orden de creación (y "el primer perfil") queda determinado.
    const latest = (await profilesTable().toArray()).reduce((max, p) => (p.createdAt > max ? p.createdAt : max), '');
    let at = Date.now();
    if (latest && new Date(at).toISOString() <= latest) at = Date.parse(latest) + 1;
    const now = new Date(at).toISOString();
    const profile: Profile = { id: newId(), name: parsed.name, createdAt: now, modifiedAt: now, revision: 1 };
    await profilesTable().add(profile);
    await db.table('settings').add({ ownerProfileId: profile.id, ...DEFAULT_SETTINGS } satisfies SettingsRow);
    return profile;
  });
}

/** Registra que los datos del perfil cambiaron (revision + modifiedAt). Los repositorios lo llaman en cada escritura. */
export async function touchProfile(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.table('profiles'), async () => {
    const p = await profilesTable().get(id);
    if (!p) throw new Error('El perfil no existe');
    await profilesTable().put({ ...p, revision: p.revision + 1, modifiedAt: new Date().toISOString() });
  });
}

export async function renameProfile(id: string, rawName: string): Promise<Profile> {
  const parsed = parseProfileName(rawName);
  if (!parsed.ok) throw new Error(parsed.error);
  const db = getDb();
  return db.transaction('rw', db.table('profiles'), async () => {
    const p = await profilesTable().get(id);
    if (!p) throw new Error('El perfil no existe');
    if (p.name === parsed.name) return p;
    const next = { ...p, name: parsed.name, revision: p.revision + 1, modifiedAt: new Date().toISOString() };
    await profilesTable().put(next);
    return next;
  });
}

/** Borrado en cascada en una única transacción sobre el registro de stores: no deja huérfanos. */
export async function deleteProfile(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tables, async () => {
    await deleteProfileRows(db, getConfig().stores, id);
  });
}
