import { create } from 'zustand';
import { closeDb, openDb } from '@/data/db';
import { loadCredential, removeCredential, saveCredential } from '@/data/credentials';
import { createProfile, deleteProfile, getProfile, listProfiles, renameProfile } from '@/data/profiles';
import { getSettings, updateSettings } from '@/data/settings';
import type { DataConfig } from '@/data/stores';
import type { Profile, SettingsRow } from '@/data/types';
import { getLastActiveProfileId, setLastActiveProfileId } from './activeProfile';
import { KeyError, verifyDageKey, type KeyClaims, type KeyErrorCode } from './keys/dagekey';
import { TRUSTED_KEYS } from './keys/trustedKeys';
import { requestPersistence } from './storage';

export type KeyState =
  | { status: 'none' }
  | { status: 'valid'; claims: KeyClaims }
  | { status: 'invalid'; code: KeyErrorCode; message: string };

export interface SessionState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  profiles: Profile[];
  active: Profile | null;
  settings: SettingsRow | null;
  key: KeyState;
}

const initial: SessionState = { status: 'loading', error: null, profiles: [], active: null, settings: null, key: { status: 'none' } };

export const useSession = create<SessionState>(() => initial);

const set = useSession.setState;
const get = useSession.getState;

/** Valida la credencial guardada del perfil contra las claves públicas de confianza. */
export async function computeKeyState(profileId: string, now = new Date(), trusted = TRUSTED_KEYS): Promise<KeyState> {
  const bytes = await loadCredential(profileId);
  if (!bytes) return { status: 'none' };
  try {
    return { status: 'valid', claims: verifyDageKey(bytes, { trusted, profileId, now }) };
  } catch (e) {
    if (e instanceof KeyError) return { status: 'invalid', code: e.code, message: e.message };
    throw e;
  }
}

async function activate(profile: Profile | null, profiles?: Profile[]): Promise<void> {
  const list = profiles ?? (await listProfiles());
  if (!profile) {
    setLastActiveProfileId(null);
    set({ profiles: list, active: null, settings: null, key: { status: 'none' } });
    return;
  }
  const [settings, key] = await Promise.all([getSettings(profile.id), computeKeyState(profile.id)]);
  setLastActiveProfileId(profile.id);
  set({ profiles: list, active: profile, settings, key });
}

function describeOpenError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name;
  if (name === 'VersionError') {
    return 'Los datos guardados pertenecen a una versión más nueva de la app. Actualiza la app para abrirlos.';
  }
  return 'No se puede abrir el almacenamiento local (IndexedDB). Comprueba que no estás en una ventana privada y que el navegador permite guardar datos.';
}

/** Arranque: abre la base de datos, recupera el último perfil activo (o el primero) y revalida su llave. */
export async function initSession(config: DataConfig, dbName?: string): Promise<void> {
  set({ ...initial });
  try {
    await openDb(config, dbName);
    const profiles = await listProfiles();
    const last = getLastActiveProfileId();
    const profile = profiles.find((p) => p.id === last) ?? profiles[0] ?? null;
    await activate(profile, profiles);
    set({ status: 'ready' });
    if (profile) void requestPersistence();
  } catch (e) {
    console.error(e);
    set({ status: 'error', error: describeOpenError(e) });
  }
}

export function shutdownSession(): void {
  closeDb();
  set({ ...initial });
}

export async function refreshProfiles(): Promise<void> {
  const profiles = await listProfiles();
  set({ profiles });
  const { active } = get();
  if (active) {
    const fresh = profiles.find((p) => p.id === active.id) ?? null;
    if (!fresh) await activate(profiles[0] ?? null, profiles);
    else set({ active: fresh });
  }
}

export async function createAndActivateProfile(name: string): Promise<Profile> {
  const profile = await createProfile(name);
  await activate(profile);
  void requestPersistence();
  return profile;
}

export async function switchProfile(id: string): Promise<void> {
  const profile = await getProfile(id);
  if (!profile) throw new Error('El perfil no existe');
  await activate(profile);
}

/** Activa un perfil recién importado o restaurado, releyendo todo desde la base de datos. */
export async function reloadAndActivate(id: string): Promise<void> {
  await switchProfile(id);
}

export async function renameActiveProfile(name: string): Promise<void> {
  const { active } = get();
  if (!active) return;
  const renamed = await renameProfile(active.id, name);
  set({ active: renamed, profiles: await listProfiles() });
}

export async function deleteProfileById(id: string): Promise<void> {
  await deleteProfile(id);
  const profiles = await listProfiles();
  const { active } = get();
  if (active?.id === id) await activate(profiles[0] ?? null, profiles);
  else set({ profiles });
}

/** Instala una llave: se valida (y se rechaza si no es válida) antes de guardarla. Devuelve sus permisos. */
export async function installKey(bytes: Uint8Array, now = new Date()): Promise<KeyClaims> {
  const { active } = get();
  if (!active) throw new Error('No hay perfil activo');
  const claims = verifyDageKey(bytes, { trusted: TRUSTED_KEYS, profileId: active.id, now });
  await saveCredential(active.id, bytes);
  set({ key: { status: 'valid', claims }, active: (await getProfile(active.id)) ?? active });
  return claims;
}

export async function uninstallKey(): Promise<void> {
  const { active } = get();
  if (!active) return;
  await removeCredential(active.id);
  set({ key: { status: 'none' }, active: (await getProfile(active.id)) ?? active });
}

/** Vuelve a validar la credencial (al volver a primer plano o al llegar su caducidad). */
export async function revalidateKey(now = new Date()): Promise<void> {
  const { active } = get();
  if (!active) return;
  const key = await computeKeyState(active.id, now);
  if (get().active?.id === active.id) set({ key });
}

export async function changeSettings(patch: Parameters<typeof updateSettings>[1]): Promise<void> {
  const { active } = get();
  if (!active) return;
  const settings = await updateSettings(active.id, patch);
  set({ settings, active: (await getProfile(active.id)) ?? active });
}

export async function reloadSettings(): Promise<void> {
  const { active } = get();
  if (active) set({ settings: await getSettings(active.id) });
}
