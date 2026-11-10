import { afterEach, describe, expect, it } from 'vitest';
import { closeDb, getConfig, getDb } from './db';
import { loadCredential, removeCredential, saveCredential } from './credentials';
import { createProfile, deleteProfile, getProfile, listProfiles, parseProfileName, renameProfile, touchProfile } from './profiles';
import { getSettings, updateSettings } from './settings';
import { openTestDb } from './testing';

afterEach(() => closeDb());

async function addNote(profileId: string, id: string, text = 'hola') {
  await getDb().table('notes').put({ ownerProfileId: profileId, id, text });
  await touchProfile(profileId);
}

/** Cuenta, para todas las tablas del registro, las filas que pertenecen al perfil. */
async function rowsOf(profileId: string) {
  const out: Record<string, number> = {};
  for (const s of getConfig().stores) {
    if (s.ownerField === null) continue;
    out[s.table] = await getDb().table(s.table).where(s.ownerField).equals(profileId).count();
  }
  return out;
}

describe('perfiles', () => {
  it('crea un perfil con id aleatorio, ajustes por defecto y revisión 1', async () => {
    await openTestDb();
    const a = await createProfile('  Ana   la  DJ ');
    const b = await createProfile('Beto');
    expect(a.name).toBe('Ana la DJ');
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.revision).toBe(1);
    expect((await getSettings(a.id)).textScale).toBe('normal');
    expect((await listProfiles()).map((p) => p.name)).toEqual(['Ana la DJ', 'Beto']);
  });

  it('no usa crypto.randomUUID', async () => {
    await openTestDb();
    const original = crypto.randomUUID;
    // @ts-expect-error simulamos HTTP sin contexto seguro
    crypto.randomUUID = undefined;
    try {
      await expect(createProfile('Sin UUID')).resolves.toBeTruthy();
    } finally {
      crypto.randomUUID = original;
    }
  });

  it('valida el nombre', () => {
    expect(parseProfileName('   ')).toMatchObject({ ok: false });
    expect(parseProfileName('x'.repeat(41))).toMatchObject({ ok: false });
    expect(parseProfileName(' Ok ')).toEqual({ ok: true, name: 'Ok' });
  });

  it('renombrar y cambiar ajustes sube la revisión', async () => {
    await openTestDb();
    const p = await createProfile('Ana');
    await renameProfile(p.id, 'Ana B');
    await updateSettings(p.id, { textScale: 'large' });
    const now = (await getProfile(p.id))!;
    expect(now.name).toBe('Ana B');
    expect(now.revision).toBe(3);
    expect((await getSettings(p.id)).textScale).toBe('large');
  });

  it('aísla los datos de cada perfil', async () => {
    await openTestDb();
    const a = await createProfile('A');
    const b = await createProfile('B');
    await addNote(a.id, 'n1', 'de A');
    await addNote(b.id, 'n1', 'de B'); // mismo id de fila, otro perfil
    await updateSettings(a.id, { textScale: 'xlarge' });
    await saveCredential(a.id, new Uint8Array([1, 2, 3]));

    expect(await getDb().table('notes').get([a.id, 'n1'])).toMatchObject({ text: 'de A' });
    expect(await getDb().table('notes').get([b.id, 'n1'])).toMatchObject({ text: 'de B' });
    expect((await getSettings(b.id)).textScale).toBe('normal');
    expect(await loadCredential(b.id)).toBeNull();
    expect(Array.from((await loadCredential(a.id))!)).toEqual([1, 2, 3]);
    await removeCredential(a.id);
    expect(await loadCredential(a.id)).toBeNull();
  });

  it('borra en cascada todas las tablas registradas sin dejar huérfanos', async () => {
    await openTestDb();
    const a = await createProfile('A');
    const b = await createProfile('B');
    for (const p of [a, b]) {
      await addNote(p.id, 'n1');
      await addNote(p.id, 'n2');
      await saveCredential(p.id, new Uint8Array([9]));
      await getDb().table('snapshots').put({ ownerProfileId: p.id, id: 's1', createdAt: new Date().toISOString(), reason: 'manual', revision: 1, data: {} });
    }
    const before = await rowsOf(b.id);

    await deleteProfile(a.id);

    const afterA = await rowsOf(a.id);
    expect(Object.values(afterA).every((n) => n === 0), JSON.stringify(afterA)).toBe(true);
    expect(await getProfile(a.id)).toBeUndefined();
    expect(await rowsOf(b.id)).toEqual(before); // el otro perfil intacto
  });

  it('el borrado es atómico: si falla, no se borra nada', async () => {
    await openTestDb();
    const a = await createProfile('A');
    await addNote(a.id, 'n1');
    // Una tabla del registro que falla al borrar fuerza el aborto de la transacción.
    const notes = getDb().table('notes');
    const original = notes.where.bind(notes);
    notes.where = (() => {
      throw new Error('fallo simulado');
    }) as typeof notes.where;
    try {
      await expect(deleteProfile(a.id)).rejects.toThrow('fallo simulado');
    } finally {
      notes.where = original;
    }
    expect(await getProfile(a.id)).toBeDefined();
    expect((await rowsOf(a.id)).notes).toBe(1);
    expect((await rowsOf(a.id)).settings).toBe(1);
  });
});
