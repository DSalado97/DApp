import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDb } from '../db';
import { loadCredential } from '../credentials';
import { getProfile } from '../profiles';
import { getSettings } from '../settings';
import { openTestDb } from '../testing';
import { analyzeImport, applyImport } from './importer';

afterEach(() => closeDb());

/**
 * Golden fixtures: un archivo por versión de esquema, generado con esa versión y NUNCA regenerado.
 * Si un cambio rompe la importación de una versión anterior, este test falla. Al subir el esquema,
 * añade `v<N>.dageprofile` generado con la nueva versión y un caso aquí; no toques los anteriores.
 */
const load = (name: string) => readFileSync(resolve(process.cwd(), 'src/data/__fixtures__', name), 'utf8');

describe('golden fixtures', () => {
  it('v1 se importa con la app actual (esquema 1 → actual)', async () => {
    await openTestDb(); // el esquema actual es más nuevo que el del fixture
    const analysis = await analyzeImport(load('v1.dageprofile'));
    expect(analysis.file.schemaVersion).toBeGreaterThan(1);
    expect(analysis.migratedFrom).toBe(1);
    expect(analysis.counts).toEqual({ credentials: 1, settings: 1 });

    const { profileId } = await applyImport(analysis, 'new');
    expect(profileId).toBe('00000000000000000000000000000001');
    expect(await getProfile(profileId)).toEqual({
      id: profileId,
      name: 'Perfil de prueba',
      createdAt: '2026-11-01T09:00:00.000Z',
      modifiedAt: '2026-11-06T18:30:00.000Z',
      revision: 4,
    });
    expect(await getSettings(profileId)).toEqual({
      ownerProfileId: profileId,
      textScale: 'large',
      backupReminderDays: 30,
      lastBackupAt: '2026-11-05T12:00:00.000Z',
    });
    expect(Array.from((await loadCredential(profileId))!)).toEqual([1, 2, 3]);
  });

  it('v1 sigue siendo válido con el esquema 1 sin migrar', async () => {
    await openTestDb([]);
    const analysis = await analyzeImport(load('v1.dageprofile'));
    expect(analysis.migratedFrom).toBeNull();
  });
});
