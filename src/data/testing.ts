/** Utilidades para tests de la capa de datos (no se incluyen en la app: solo las importan *.test.ts). */
import type { FeatureManifest } from '@/core/modules';
import { closeDb, openDb } from './db';
import { dataConfigFor, type DataConfig } from './stores';

/** Módulo de prueba con una tabla propia, para comprobar que el registro cubre tablas de módulos. */
export const notesManifest: FeatureManifest = {
  id: 'notes-test',
  routes: [],
  nav: null,
  requiredPermission: null,
  ownedStores: [{ table: 'notes', ownerField: 'ownerProfileId', schema: '[ownerProfileId+id], ownerProfileId', since: 2 }],
  migrations: [],
};

let counter = 0;

export async function openTestDb(manifests: readonly FeatureManifest[] = [notesManifest], name = `test-db-${Date.now()}-${counter++}`) {
  const config = dataConfigFor(manifests);
  const db = await openDb(config, name);
  return { db, config, name };
}

export async function reopenTestDb(config: DataConfig, name: string) {
  closeDb();
  return openDb(config, name);
}

export { closeDb };
