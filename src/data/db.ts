import Dexie from 'dexie';
import type { ModuleMigration, StoreTx } from '@/core/modules';
import { validateStoreSpecs, type DataConfig } from './stores';
import { createSnapshot } from './exchange/build';
import { randomHex } from './encoding';
import type { Profile } from './types';

export const DB_NAME = 'dragon-age-dm-station';

export interface SchemaVersion {
  version: number;
  stores: Record<string, string>;
  migrations: ModuleMigration[];
}

/** Versiones Dexie acumulativas: la N declara todas las tablas con `since <= N`. */
export function buildSchemaHistory(config: DataConfig): SchemaVersion[] {
  const max = Math.max(1, ...config.stores.map((s) => s.since), ...config.migrations.map((m) => m.version));
  const history: SchemaVersion[] = [];
  for (let v = 1; v <= max; v++) {
    history.push({
      version: v,
      stores: Object.fromEntries(config.stores.filter((s) => s.since <= v).map((s) => [s.table, s.schema])),
      migrations: config.migrations.filter((m) => m.version === v),
    });
  }
  return history;
}

interface Runtime {
  db: Dexie;
  config: DataConfig;
  version: number;
}
let runtime: Runtime | null = null;

/**
 * Abre la base de datos con el esquema del núcleo + las tablas de los módulos. Antes de una migración
 * destructiva guarda un snapshot recuperable de cada perfil, dentro de la misma transacción de actualización.
 */
export async function openDb(config: DataConfig, name = DB_NAME): Promise<Dexie> {
  validateStoreSpecs(config.stores);
  if (runtime) throw new Error('La base de datos ya está abierta');
  const db = new Dexie(name);
  const history = buildSchemaHistory(config);
  for (const step of history) {
    const v = db.version(step.version).stores(step.stores);
    if (step.migrations.length === 0) continue;
    v.upgrade(async (tx) => {
      if (step.migrations.some((m) => m.destructive)) {
        const ctx = { specs: config.stores, schemaVersion: step.version - 1, deviceId: 'migration' };
        for (const p of (await tx.table('profiles').toArray()) as Profile[]) await createSnapshot(tx, ctx, p.id, 'migration');
      }
      for (const m of step.migrations) await m.upgrade?.(tx as unknown as StoreTx);
    });
  }
  await db.open();
  // Dexie 4 abre sin quejarse una base de datos de una versión MÁS NUEVA que la declarada (internamente versión × 10).
  // Escribir ahí con un esquema antiguo podría dañar datos de una app más reciente: se rechaza.
  if (db.backendDB().version > history.length * 10) {
    db.close();
    throw Object.assign(new Error('La base de datos pertenece a una versión más nueva de la app'), { name: 'VersionError' });
  }
  runtime = { db, config, version: history.length };
  return db;
}

export function getDb(): Dexie {
  if (!runtime) throw new Error('La base de datos no está abierta');
  return runtime.db;
}

export function getConfig(): DataConfig {
  if (!runtime) throw new Error('La base de datos no está abierta');
  return runtime.config;
}

export function getSchemaVersion(): number {
  if (!runtime) throw new Error('La base de datos no está abierta');
  return runtime.version;
}

export function closeDb(): void {
  runtime?.db.close();
  runtime = null;
}

/** Solo para tests: cierra y borra la base de datos. */
export async function destroyDb(name = DB_NAME): Promise<void> {
  closeDb();
  await Dexie.delete(name);
}

/** Identificador estable de este dispositivo (informativo en los archivos exportados). */
export async function getDeviceId(): Promise<string> {
  const meta = getDb().table('meta');
  const row = (await meta.get('deviceId')) as { key: string; value: string } | undefined;
  if (row) return row.value;
  const value = randomHex(8);
  await meta.put({ key: 'deviceId', value });
  return value;
}
