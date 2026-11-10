import type { ComponentType } from 'react';
import type { Permission } from './keys/dagekey';

/** Permisos del Modo DJ. `null` en `requiredPermission` = Modo Jugador (sin llave). */
export type { Permission };

export interface ModuleRoute {
  /** Ruta relativa al layout del modo (sin barra inicial). `''` = índice. */
  path: string;
  Component: ComponentType;
}

export interface ModuleNav {
  label: string;
  /** Ruta a la que enlaza (relativa al modo). */
  to: string;
}

/**
 * Tabla que posee una feature. El registro de stores (`data/stores.ts`) la usa para exportar, importar y borrar en cascada.
 * El esquema Dexie debe empezar por `ownerProfileId` o `[ownerProfileId+...]` y, si es compuesto, indexar `ownerProfileId`
 * (p. ej. `'[ownerProfileId+id], ownerProfileId, name'`): así el borrado en cascada y la importación como perfil
 * independiente solo tocan ese campo.
 */
export interface ModuleStoreDeclaration {
  /** Nombre de la tabla Dexie. */
  table: string;
  /** Campo que contiene el perfil propietario. */
  ownerField: 'ownerProfileId';
  /** Esquema Dexie (clave primaria + índices). */
  schema: string;
  /** Versión del esquema de la base de datos en la que aparece la tabla (empieza en 2; la 1 es el núcleo). */
  since: number;
}

/** Subconjunto de la transacción que ven las migraciones: sirve igual sobre Dexie y sobre archivos de importación. */
export interface StoreTx {
  table(name: string): {
    toCollection(): { modify(fn: (row: Record<string, unknown>) => void): PromiseLike<unknown> };
  };
}

export interface ModuleMigration {
  /** Versión del esquema de la base de datos a la que lleva esta migración. */
  version: number;
  description: string;
  /** Transforma filas. Se ejecuta al actualizar IndexedDB y al importar archivos de una versión anterior. */
  upgrade?: (tx: StoreTx) => Promise<void>;
  /** Si pierde o reescribe datos: antes se guarda un snapshot local de cada perfil. */
  destructive?: boolean;
}

/** Manifiesto único de cada feature (ver docs/ARCHITECTURE.md). */
export interface FeatureManifest {
  id: string;
  routes: ModuleRoute[];
  nav: ModuleNav | null;
  requiredPermission: Permission | null;
  ownedStores: ModuleStoreDeclaration[];
  migrations: ModuleMigration[];
}

export function validateManifests(manifests: readonly FeatureManifest[]): void {
  const ids = new Set<string>();
  const tables = new Set<string>();
  for (const m of manifests) {
    if (ids.has(m.id)) throw new Error(`Módulo duplicado: ${m.id}`);
    ids.add(m.id);
    for (const s of m.ownedStores) {
      if (tables.has(s.table)) throw new Error(`Tabla duplicada: ${s.table}`);
      tables.add(s.table);
    }
  }
}
