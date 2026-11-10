import { afterEach, describe, expect, it } from 'vitest';
import type { FeatureManifest } from '@/core/modules';
import { closeDb, getDb } from '../db';
import { loadCredential, saveCredential } from '../credentials';
import { createProfile, deleteProfile, getProfile, listProfiles, renameProfile, touchProfile } from '../profiles';
import { getSettings, updateSettings } from '../settings';
import { notesManifest, openTestDb, reopenTestDb } from '../testing';
import { checksumOf, seal, type ExportFile } from './format';
import {
  analyzeImport,
  applyImport,
  compareWithExisting,
  deleteSnapshot,
  exportProfile,
  exportSnapshot,
  listSnapshots,
  restoreSnapshot,
  takeSnapshot,
} from './importer';
import { ImportError } from './parse';
import { dataConfigFor } from '../stores';

afterEach(() => closeDb());

async function addNote(profileId: string, id: string, text: string) {
  await getDb().table('notes').put({ ownerProfileId: profileId, id, text });
  await touchProfile(profileId);
}
const notesOf = (profileId: string) => getDb().table('notes').where('ownerProfileId').equals(profileId).sortBy('id');

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof ImportError) return e.code;
    throw e;
  }
  throw new Error('no lanzó ImportError');
}

/** Modifica un archivo ya exportado y lo vuelve a sellar (para fabricar archivos defectuosos pero con checksum correcto). */
function tamper(text: string, edit: (f: ExportFile) => void): string {
  const f = JSON.parse(text) as ExportFile;
  edit(f);
  const { checksumSha256: _c, ...body } = f;
  void _c;
  return JSON.stringify(seal(body));
}

async function seed() {
  const p = await createProfile('Ana');
  await addNote(p.id, 'n1', 'uno');
  await addNote(p.id, 'n2', 'dos');
  await updateSettings(p.id, { textScale: 'large' });
  await saveCredential(p.id, new Uint8Array([7, 7, 7]));
  return (await getProfile(p.id))!;
}

describe('exportar e importar', () => {
  it('ida y vuelta sin pérdida', async () => {
    await openTestDb();
    const p = await seed();
    const notes = await notesOf(p.id);
    const settings = await getSettings(p.id);
    const { text, filename } = await exportProfile(p.id);
    expect(filename).toMatch(/^ana-\d{4}-\d{2}-\d{2}\.dageprofile$/);

    await deleteProfile(p.id);
    const analysis = await analyzeImport(text);
    expect(analysis.existing).toBeNull();
    expect(analysis.counts).toMatchObject({ notes: 2, settings: 1, credentials: 1 });
    expect(analysis.hasKey).toBe(true);
    await applyImport(analysis, 'new');

    expect(await getProfile(p.id)).toEqual(p);
    expect(await notesOf(p.id)).toEqual(notes);
    expect(await getSettings(p.id)).toEqual(settings);
    expect(Array.from((await loadCredential(p.id))!)).toEqual([7, 7, 7]);
  });

  it('el archivo contiene la estructura documentada', async () => {
    await openTestDb();
    const p = await seed();
    const { file } = await exportProfile(p.id);
    expect(Object.keys(file).sort()).toEqual(
      ['app', 'assets', 'checksumSha256', 'deviceId', 'exportedAt', 'format', 'formatVersion', 'modifiedAt', 'profile', 'revision', 'schemaVersion', 'stores'].sort(),
    );
    expect(file.format).toBe('dageprofile');
    expect(file.app).toBe('dragon-age-dm-station');
    const { checksumSha256, ...body } = file;
    expect(checksumSha256).toBe(checksumOf(body));
    expect(Object.keys(file.stores).sort()).toEqual(['credentials', 'notes', 'settings']); // snapshots y meta no viajan
  });

  it('rechaza un checksum alterado, ya sea en el contenido o en el propio checksum', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    const edited = text.replace('"uno"', '"UNO"');
    expect(edited).not.toBe(text);
    expect(await codeOf(analyzeImport(edited))).toBe('checksum');
    const f = JSON.parse(text) as ExportFile;
    f.checksumSha256 = '0'.repeat(64);
    expect(await codeOf(analyzeImport(JSON.stringify(f)))).toBe('checksum');
  });

  it('rechaza archivos que no son un perfil', async () => {
    await openTestDb();
    expect(await codeOf(analyzeImport('esto no es json'))).toBe('format');
    expect(await codeOf(analyzeImport('[1,2]'))).toBe('format');
    expect(await codeOf(analyzeImport('{"format":"dageprofile"}'))).toBe('format');
    const p = await seed();
    const { text } = await exportProfile(p.id);
    expect(await codeOf(analyzeImport(tamper(text, (f) => void (f.app = 'otra-app'))))).toBe('app');
  });

  it('rechaza versiones futuras de formato o de esquema', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    expect(await codeOf(analyzeImport(tamper(text, (f) => void (f.schemaVersion += 1))))).toBe('future');
    expect(await codeOf(analyzeImport(tamper(text, (f) => void (f.formatVersion = 2))))).toBe('future');
  });

  it('rechaza filas que no pertenecen al perfil del archivo y tablas desconocidas', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    const foreign = tamper(text, (f) => {
      f.stores.notes!.push({ ownerProfileId: 'otro-perfil', id: 'x', text: 'colada' });
    });
    expect(await codeOf(analyzeImport(foreign))).toBe('owner');
    const unknown = tamper(text, (f) => void (f.stores.tablaInventada = [{ ownerProfileId: p.id }]));
    expect(await codeOf(analyzeImport(unknown))).toBe('unknownStore');
    const root = tamper(text, (f) => void (f.stores.profiles = [{ id: p.id }]));
    expect(await codeOf(analyzeImport(root))).toBe('unknownStore');
    const snaps = tamper(text, (f) => void (f.stores.snapshots = [{ ownerProfileId: p.id, id: 's' }]));
    expect(await codeOf(analyzeImport(snaps))).toBe('unknownStore');
  });
});

describe('migración de archivos antiguos', () => {
  const v1: FeatureManifest = {
    ...notesManifest,
    ownedStores: [{ table: 'notes', ownerField: 'ownerProfileId', schema: '[ownerProfileId+id], ownerProfileId', since: 1 }],
  };
  const v2: FeatureManifest = {
    ...v1,
    migrations: [
      {
        version: 2,
        description: 'text → body',
        upgrade: async (tx) => {
          await tx.table('notes').toCollection().modify((row) => {
            row.body = row.text;
            delete row.text;
          });
        },
      },
    ],
  };

  it('migra un archivo de una versión anterior y también los datos de IndexedDB', async () => {
    const { name } = await openTestDb([v1]);
    const p = await createProfile('Vieja');
    await addNote(p.id, 'n1', 'texto antiguo');
    const { text, file } = await exportProfile(p.id);
    expect(file.schemaVersion).toBe(1);

    // La app se actualiza: el esquema pasa a la versión 2 y Dexie migra los datos existentes.
    await reopenTestDb(dataConfigFor([v2]), name);
    expect(await notesOf(p.id)).toEqual([{ ownerProfileId: p.id, id: 'n1', body: 'texto antiguo' }]);

    // Importar el archivo antiguo aplica la misma migración.
    await deleteProfile(p.id);
    const analysis = await analyzeImport(text);
    expect(analysis.migratedFrom).toBe(1);
    expect(analysis.file.schemaVersion).toBe(2);
    await applyImport(analysis, 'new');
    expect(await notesOf(p.id)).toEqual([{ ownerProfileId: p.id, id: 'n1', body: 'texto antiguo' }]);
  });

  it('antes de una migración destructiva guarda un snapshot recuperable', async () => {
    const { name } = await openTestDb([v1]);
    const p = await createProfile('Con datos');
    await addNote(p.id, 'n1', 'valioso');

    const destructive: FeatureManifest = {
      ...v1,
      migrations: [
        {
          version: 2,
          description: 'borra todo',
          destructive: true,
          upgrade: async (tx) => {
            await tx.table('notes').toCollection().modify((row) => {
              row.text = '';
            });
          },
        },
      ],
    };
    await reopenTestDb(dataConfigFor([destructive]), name);

    expect((await notesOf(p.id))[0]).toMatchObject({ text: '' });
    const snaps = await listSnapshots(p.id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.reason).toBe('migration');

    // Se recupera como archivo: el contenido original sigue intacto y es un .dageprofile válido.
    const saved = await exportSnapshot(p.id, snaps[0]!.id);
    expect(saved.filename).toMatch(/\.dageprofile$/);
    expect(JSON.parse(saved.text).stores.notes[0].text).toBe('valioso');
    expect((await analyzeImport(saved.text)).existing?.id).toBe(p.id);
  });
});

describe('conflictos', () => {
  it('clasifica el archivo frente al perfil existente', () => {
    const existing = { id: 'p', name: 'x', createdAt: '', revision: 5, modifiedAt: '2026-05-01T00:00:00.000Z' };
    const cmp = (revision: number, modifiedAt: string) => compareWithExisting({ revision, modifiedAt }, existing);
    expect(cmp(5, '2026-05-01T00:00:00.000Z')).toBe('identical');
    expect(cmp(7, '2026-06-01T00:00:00.000Z')).toBe('newer');
    expect(cmp(3, '2026-04-01T00:00:00.000Z')).toBe('older');
    expect(cmp(5, '2026-05-02T00:00:00.000Z')).toBe('divergent'); // misma revisión, distinta fecha
    expect(cmp(7, '2026-04-01T00:00:00.000Z')).toBe('divergent'); // más revisiones pero más antiguo
    expect(cmp(3, '2026-06-01T00:00:00.000Z')).toBe('divergent');
  });

  it('detecta un archivo idéntico, uno más antiguo y uno más reciente', async () => {
    await openTestDb();
    const p = await seed();
    const { text: v0 } = await exportProfile(p.id);
    expect((await analyzeImport(v0)).relation).toBe('identical');

    await addNote(p.id, 'n3', 'tres');
    const a = await analyzeImport(v0);
    expect(a.relation).toBe('older');
    expect(a.existing?.id).toBe(p.id);

    const { text: v1 } = await exportProfile(p.id);
    await restoreOldAndCompare(p.id, v0, v1);
  });

  async function restoreOldAndCompare(id: string, older: string, newer: string) {
    // Sustituir por el antiguo y comparar el reciente: ahora el archivo reciente es "newer".
    await applyImport(await analyzeImport(older), 'replace');
    expect((await analyzeImport(newer)).relation).toBe('newer');
    expect(await codeOf(applyImport(await analyzeImport(older), 'new'))).toBe('exists');
    expect((await notesOf(id)).map((n) => n.id)).toEqual(['n1', 'n2']);
  }

  it('sustituir guarda antes un snapshot automático y no pierde las copias del perfil', async () => {
    await openTestDb();
    const p = await seed();
    const { text: older } = await exportProfile(p.id);
    await addNote(p.id, 'n3', 'tres');
    await takeSnapshot(p.id); // copia previa del usuario
    const analysis = await analyzeImport(older);
    expect(analysis.relation).toBe('older');
    await applyImport(analysis, 'replace');

    const snaps = await listSnapshots(p.id);
    expect(snaps.map((s) => s.reason).sort()).toEqual(['import', 'manual']);
    expect((await notesOf(p.id)).map((n) => n.id)).toEqual(['n1', 'n2']);
    // El snapshot automático contiene el estado previo, con la nota 3.
    const auto = snaps.find((s) => s.reason === 'import')!;
    await restoreSnapshot(p.id, auto.id);
    expect((await notesOf(p.id)).map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
  });

  it('sustituir falla si el perfil ya no existe', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    const analysis = await analyzeImport(text);
    await deleteProfile(p.id);
    expect(await codeOf(applyImport(analysis, 'replace'))).toBe('missing');
  });

  it('una importación fallida no deja datos a medias', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    const analysis = await analyzeImport(text);
    // Una fila inválida para Dexie (clave compuesta con undefined) aborta la transacción entera.
    analysis.file.stores.notes!.push({ ownerProfileId: p.id, id: undefined, text: 'rota' });
    await expect(applyImport(analysis, 'replace')).rejects.toThrow();
    expect((await notesOf(p.id)).map((n) => n.id)).toEqual(['n1', 'n2']);
    expect((await getProfile(p.id))!.revision).toBe(analysis.existing!.revision);
    expect(await listSnapshots(p.id)).toHaveLength(0); // el snapshot también se revirtió
  });
});

describe('importar como perfil independiente', () => {
  it('genera un ID nuevo, reasigna las filas y pierde la llave', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    const analysis = await analyzeImport(text);
    expect(analysis.hasKey).toBe(true);

    const { profileId } = await applyImport(analysis, 'independent');
    expect(profileId).not.toBe(p.id);
    const copy = (await getProfile(profileId))!;
    expect(copy.name).toBe('Ana (copia)');
    expect(copy.revision).toBe(1);
    expect((await notesOf(profileId)).map((n) => n.text)).toEqual(['uno', 'dos']);
    expect((await getSettings(profileId)).textScale).toBe('large');
    expect(await loadCredential(profileId)).toBeNull(); // la llave estaba ligada al ID original
    // El original sigue intacto, con su llave.
    expect(Array.from((await loadCredential(p.id))!)).toEqual([7, 7, 7]);
    expect((await notesOf(p.id)).map((n) => n.text)).toEqual(['uno', 'dos']);
    expect(await listProfiles()).toHaveLength(2);
  });

  it('sin perfil existente conserva el nombre', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    await deleteProfile(p.id);
    const { profileId } = await applyImport(await analyzeImport(text), 'independent');
    expect((await getProfile(profileId))!.name).toBe('Ana');
  });

  it('puede importarse varias veces sin colisiones de claves', async () => {
    await openTestDb();
    const p = await seed();
    const { text } = await exportProfile(p.id);
    const a = await applyImport(await analyzeImport(text), 'independent');
    const b = await applyImport(await analyzeImport(text), 'independent');
    expect(new Set([p.id, a.profileId, b.profileId]).size).toBe(3);
    expect(await getDb().table('notes').count()).toBe(6);
  });
});

describe('snapshots', () => {
  it('restaura un snapshot, guarda el estado previo y sube la revisión', async () => {
    await openTestDb();
    const p = await seed();
    const snap = await takeSnapshot(p.id);
    await addNote(p.id, 'n3', 'tres');
    await renameProfile(p.id, 'Ana cambiada');
    const before = (await getProfile(p.id))!;

    await restoreSnapshot(p.id, snap.id);

    const after = (await getProfile(p.id))!;
    expect(after.name).toBe('Ana');
    expect(after.revision).toBe(before.revision + 1);
    expect((await notesOf(p.id)).map((n) => n.id)).toEqual(['n1', 'n2']);
    expect(Array.from((await loadCredential(p.id))!)).toEqual([7, 7, 7]);
    expect((await listSnapshots(p.id)).map((s) => s.reason)).toContain('restore');
  });

  it('conserva solo los 3 últimos por perfil', async () => {
    await openTestDb();
    const a = await seed();
    const b = await createProfile('Otro');
    for (let i = 0; i < 5; i++) {
      await addNote(a.id, `x${i}`, 'x');
      await takeSnapshot(a.id);
    }
    await takeSnapshot(b.id);
    const snaps = await listSnapshots(a.id);
    expect(snaps).toHaveLength(3);
    expect(snaps.map((s) => s.revision)).toEqual([...snaps.map((s) => s.revision)].sort((x, y) => y - x));
    expect(await listSnapshots(b.id)).toHaveLength(1);
  });

  it('borra un snapshot y avisa si ya no existe', async () => {
    await openTestDb();
    const p = await seed();
    const snap = await takeSnapshot(p.id);
    await deleteSnapshot(p.id, snap.id);
    expect(await listSnapshots(p.id)).toHaveLength(0);
    expect(await codeOf(restoreSnapshot(p.id, snap.id))).toBe('notFound');
  });
});
