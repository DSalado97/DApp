import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/data/db';
import { saveCredential } from '@/data/credentials';
import { dataConfigFor } from '@/data/stores';
import { notesManifest } from '@/data/testing';
import { KeyError } from './keys/dagekey';
import { issueTestKey } from './keys/testKeys';
import { hasPermission } from './permissions';
import {
  changeSettings,
  createAndActivateProfile,
  deleteProfileById,
  initSession,
  installKey,
  revalidateKey,
  shutdownSession,
  switchProfile,
  uninstallKey,
  useSession,
} from './session';

// La app confía en su clave real; los tests firman con una clave de prueba fija y la confían solo aquí.
vi.mock('./keys/trustedKeys', async () => {
  const { TEST_PUBLIC_HEX } = await import('./keys/testKeys');
  return { TRUSTED_KEYS: { 1: TEST_PUBLIC_HEX } };
});

const config = dataConfigFor([notesManifest]);
let name = '';
let n = 0;
const boot = () => initSession(config, name);
const state = () => useSession.getState();
/** Cierra y vuelve a abrir la app, como al recargar la página. */
async function restart() {
  shutdownSession();
  await boot();
}

beforeEach(async () => {
  name = `session-test-${Date.now()}-${n++}`;
  localStorage.clear();
  await boot();
});
afterEach(() => shutdownSession());

describe('sesión y perfiles', () => {
  it('sin perfiles arranca listo y sin perfil activo', () => {
    expect(state().status).toBe('ready');
    expect(state().active).toBeNull();
    expect(hasPermission(null)).toBe(true);
    expect(hasPermission('dm.combat')).toBe(false);
  });

  it('el perfil creado persiste y se recupera automáticamente al reabrir', async () => {
    const p = await createAndActivateProfile('Ana');
    expect(state().active?.id).toBe(p.id);
    expect(localStorage.getItem('dads.activeProfile')).toBe(p.id);
    await restart();
    expect(state().active).toMatchObject({ id: p.id, name: 'Ana' });
    expect(state().settings?.textScale).toBe('normal');
  });

  it('recupera el último perfil activo entre varios', async () => {
    const a = await createAndActivateProfile('A');
    const b = await createAndActivateProfile('B');
    await switchProfile(a.id);
    await restart();
    expect(state().active?.id).toBe(a.id);
    expect(state().profiles.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('si el último perfil ya no existe o localStorage está dañado, cae al primero', async () => {
    const a = await createAndActivateProfile('A');
    await createAndActivateProfile('B');
    localStorage.setItem('dads.activeProfile', 'no-existe');
    await restart();
    expect(state().active?.id).toBe(a.id);
    localStorage.removeItem('dads.activeProfile');
    await restart();
    expect(state().active?.id).toBe(a.id);
  });

  it('cambiar de perfil cambia ajustes y llave: aislamiento', async () => {
    const a = await createAndActivateProfile('A');
    await changeSettings({ textScale: 'xlarge' });
    await installKey(issueTestKey({ profileId: a.id }));
    expect(hasPermission('dm.tools')).toBe(true);

    const b = await createAndActivateProfile('B');
    expect(state().settings?.textScale).toBe('normal');
    expect(state().key.status).toBe('none');
    expect(hasPermission('dm.tools')).toBe(false);

    await switchProfile(a.id);
    expect(state().settings?.textScale).toBe('xlarge');
    expect(state().key.status).toBe('valid');
    expect(state().active?.id).not.toBe(b.id);
  });

  it('borrar el perfil activo activa otro; borrar el último deja la app sin perfil', async () => {
    const a = await createAndActivateProfile('A');
    const b = await createAndActivateProfile('B');
    await deleteProfileById(b.id);
    expect(state().active?.id).toBe(a.id);
    expect(state().profiles).toHaveLength(1);
    await deleteProfileById(a.id);
    expect(state().active).toBeNull();
    expect(localStorage.getItem('dads.activeProfile')).toBeNull();
    expect(await getDb().table('profiles').count()).toBe(0);
    expect(await getDb().table('settings').count()).toBe(0);
  });

  it('si IndexedDB pertenece a una versión más nueva, informa en lugar de romper', async () => {
    shutdownSession();
    const newer = `session-newer-${n++}`;
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(newer, 9000);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await initSession(config, newer);
    expect(state().status).toBe('error');
    expect(state().error).toMatch(/versión más nueva/);
  });
});

describe('llave del DJ', () => {
  it('instala una llave válida y concede sus permisos', async () => {
    const p = await createAndActivateProfile('Ana');
    const claims = await installKey(issueTestKey({ profileId: p.id, permissions: ['dm.combat'] }));
    expect(claims.permissions).toEqual(['dm.combat']);
    expect(hasPermission('dm.combat')).toBe(true);
    expect(hasPermission('dm.tools')).toBe(false);
    expect(hasPermission(null)).toBe(true); // el Modo Jugador sigue disponible
  });

  it('rechaza llaves de otro perfil, manipuladas o ajenas, y no guarda nada', async () => {
    const p = await createAndActivateProfile('Ana');
    const good = issueTestKey({ profileId: p.id });
    const tampered = good.slice();
    tampered[30] = tampered[30]! ^ 1;
    await expect(installKey(issueTestKey({ profileId: 'otro' }))).rejects.toMatchObject({ code: 'profile' });
    await expect(installKey(tampered)).rejects.toBeInstanceOf(KeyError);
    await expect(installKey(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ code: 'format' });
    await expect(installKey(issueTestKey({ profileId: p.id }, 9))).rejects.toMatchObject({ code: 'unknownKey' });
    expect(state().key.status).toBe('none');
    expect(await getDb().table('credentials').count()).toBe(0);
  });

  it('se guarda la credencial firmada, no un booleano, y se revalida al arrancar', async () => {
    const p = await createAndActivateProfile('Ana');
    const bytes = issueTestKey({ profileId: p.id });
    await installKey(bytes);
    const row = await getDb().table('credentials').get(p.id);
    expect(typeof row.bytes).toBe('string');
    expect(row.bytes.length).toBeGreaterThan(100);

    await restart();
    expect(state().key.status).toBe('valid');

    // Si la credencial guardada se altera en disco, al arrancar deja de valer.
    const altered = bytes.slice();
    altered[altered.length - 5] = altered[altered.length - 5]! ^ 0xff;
    await saveCredential(p.id, altered);
    await restart();
    expect(state().key).toMatchObject({ status: 'invalid', code: 'signature' });
    expect(hasPermission('dm.combat')).toBe(false);
  });

  it('una llave caducada no concede nada: al arrancar ni al revalidar durante la sesión', async () => {
    const p = await createAndActivateProfile('Ana');
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await installKey(issueTestKey({ profileId: p.id, expiresAt }));
    expect(hasPermission('dm.combat')).toBe(true);

    await revalidateKey(new Date(Date.parse(expiresAt) + 1000));
    expect(state().key).toMatchObject({ status: 'invalid', code: 'expired' });
    expect(hasPermission('dm.combat')).toBe(false);

    // Una credencial ya caducada guardada en disco tampoco sirve al arrancar.
    await saveCredential(p.id, issueTestKey({ profileId: p.id, issuedAt: '2020-01-01T00:00:00Z', expiresAt: '2021-01-01T00:00:00Z' }));
    await restart();
    expect(state().key).toMatchObject({ status: 'invalid', code: 'expired' });
  });

  it('quitar la llave desactiva el Modo DJ y sube la revisión del perfil', async () => {
    const p = await createAndActivateProfile('Ana');
    await installKey(issueTestKey({ profileId: p.id }));
    const rev = state().active!.revision;
    await uninstallKey();
    expect(state().key.status).toBe('none');
    expect(state().active!.revision).toBe(rev + 1);
    await restart();
    expect(state().key.status).toBe('none');
  });
});
