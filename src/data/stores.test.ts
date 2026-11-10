import { afterEach, describe, expect, it } from 'vitest';
import { manifests } from '@/app/registry';
import { closeDb, getConfig } from './db';
import { CORE_STORES, dataConfigFor, validateStoreSpecs, type StoreSpec } from './stores';
import { notesManifest, openTestDb } from './testing';

afterEach(() => closeDb());

describe('registro de stores', () => {
  it('toda tabla de IndexedDB está registrada (y al revés)', async () => {
    // Con los módulos reales de la app y con un módulo de prueba que posee una tabla.
    for (const mods of [manifests, [...manifests, notesManifest]]) {
      const { db, config } = await openTestDb(mods);
      const real = Array.from(db.backendDB().objectStoreNames).sort();
      const registered = config.stores.map((s) => s.table).sort();
      expect(real).toEqual(registered);
      expect(db.tables.map((t) => t.name).sort()).toEqual(registered);
      closeDb();
    }
  });

  it('cada tabla declara su módulo y su campo de perfil propietario', async () => {
    const { config } = await openTestDb();
    for (const s of config.stores) {
      expect(s.module).toBeTruthy();
      expect(s.ownerField === null || typeof s.ownerField === 'string').toBe(true);
    }
    expect(config.stores.find((s) => s.table === 'notes')).toMatchObject({ module: 'notes-test', ownerField: 'ownerProfileId' });
    expect(getConfig().stores).toBe(config.stores);
  });

  it('los datos del núcleo pertenecen al módulo core', () => {
    expect(new Set(CORE_STORES.map((s) => s.module))).toEqual(new Set(['core']));
  });

  it('rechaza una tabla duplicada', () => {
    expect(() => validateStoreSpecs([...CORE_STORES, CORE_STORES[1]!])).toThrow(/duplicada/);
  });

  it('exige que la clave primaria de una tabla de módulo incluya ownerProfileId', () => {
    const base: StoreSpec = { table: 't', module: 'm', ownerField: 'ownerProfileId', schema: '', since: 2, exportable: true };
    expect(() => validateStoreSpecs([{ ...base, schema: 'id, name' }])).toThrow(/clave primaria/);
    expect(() => validateStoreSpecs([{ ...base, schema: '[ownerProfileId+id], name' }])).toThrow(/indexar/);
    expect(() => validateStoreSpecs([{ ...base, schema: '[ownerProfileId+id], ownerProfileId' }])).not.toThrow();
    expect(() => validateStoreSpecs([{ ...base, schema: 'ownerProfileId' }])).not.toThrow();
  });

  it('dataConfigFor une el núcleo con las tablas y migraciones de los módulos', () => {
    const cfg = dataConfigFor([notesManifest]);
    expect(cfg.stores.map((s) => s.table)).toContain('notes');
    expect(cfg.stores.map((s) => s.table)).toContain('profiles');
  });
});
