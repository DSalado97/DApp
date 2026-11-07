import type { ComponentType } from 'react';

/** Permisos del Modo DJ. `null` en `requiredPermission` = Modo Jugador (sin llave). */
export type Permission = 'dm.compendium' | 'dm.campaigns' | 'dm.combat' | 'dm.encounters' | 'dm.tools';

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

export interface ModuleStoreDeclaration {
  /** Nombre de la tabla Dexie. */
  table: string;
  /** Campo que contiene el perfil propietario. */
  ownerField: 'ownerProfileId';
}

export interface ModuleMigration {
  version: number;
  description: string;
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
  for (const m of manifests) {
    if (ids.has(m.id)) throw new Error(`Módulo duplicado: ${m.id}`);
    ids.add(m.id);
  }
}
