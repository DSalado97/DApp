import type { FeatureManifest, ModuleMigration } from '@/core/modules';

/**
 * Registro de stores (crítico). Cada tabla Dexie declara su módulo y el campo que contiene su perfil propietario.
 * Exportación, importación, snapshots y borrado en cascada recorren este registro, de modo que los módulos
 * futuros quedan cubiertos sin tocar el núcleo. `stores.test.ts` falla si existe una tabla sin registrar.
 */
export interface StoreSpec {
  table: string;
  /** `'core'` o el id de la feature propietaria. */
  module: string;
  /** Campo con el id del perfil propietario; `null` = dato global del dispositivo (no pertenece a ningún perfil). */
  ownerField: string | null;
  /** Esquema Dexie: clave primaria + índices. */
  schema: string;
  /** Versión del esquema de la base de datos en la que aparece. */
  since: number;
  /** Viaja en `.dageprofile`. */
  exportable: boolean;
  /** Ligada al id del perfil (p. ej. la credencial firmada): se descarta al importar como perfil independiente. */
  profileBound?: boolean;
  /** Tabla raíz de perfiles: se exporta como `profile`, no dentro de `stores`. */
  root?: boolean;
}

export const CORE_STORES: readonly StoreSpec[] = [
  { table: 'profiles', module: 'core', ownerField: 'id', schema: 'id, name', since: 1, exportable: false, root: true },
  { table: 'credentials', module: 'core', ownerField: 'ownerProfileId', schema: 'ownerProfileId', since: 1, exportable: true, profileBound: true },
  { table: 'settings', module: 'core', ownerField: 'ownerProfileId', schema: 'ownerProfileId', since: 1, exportable: true },
  { table: 'snapshots', module: 'core', ownerField: 'ownerProfileId', schema: '[ownerProfileId+id], ownerProfileId', since: 1, exportable: false },
  { table: 'meta', module: 'core', ownerField: null, schema: 'key', since: 1, exportable: false },
];

export const CORE_MIGRATIONS: readonly ModuleMigration[] = [];

export interface DataConfig {
  stores: readonly StoreSpec[];
  migrations: readonly ModuleMigration[];
}

export function dataConfigFor(manifests: readonly FeatureManifest[]): DataConfig {
  return {
    stores: [
      ...CORE_STORES,
      ...manifests.flatMap((m) =>
        m.ownedStores.map((s): StoreSpec => ({ ...s, module: m.id, exportable: true })),
      ),
    ],
    migrations: [...CORE_MIGRATIONS, ...manifests.flatMap((m) => m.migrations)],
  };
}

/** Comprueba las reglas que hacen posible el borrado en cascada y la importación independiente. */
export function validateStoreSpecs(specs: readonly StoreSpec[]): void {
  const seen = new Set<string>();
  for (const s of specs) {
    if (seen.has(s.table)) throw new Error(`Tabla duplicada en el registro: ${s.table}`);
    seen.add(s.table);
    if (s.ownerField === null || s.root) continue;
    const tokens = s.schema.split(',').map((t) => t.trim());
    const pk = tokens[0] ?? '';
    const okPk = pk === s.ownerField || pk.startsWith(`[${s.ownerField}+`);
    if (!okPk) {
      throw new Error(`${s.table}: la clave primaria debe ser ${s.ownerField} o [${s.ownerField}+...] (es "${pk}")`);
    }
    if (pk !== s.ownerField && !tokens.includes(s.ownerField)) {
      throw new Error(`${s.table}: con clave compuesta hay que indexar ${s.ownerField}`);
    }
  }
}
