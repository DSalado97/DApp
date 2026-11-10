import type { ModuleMigration, StoreTx } from '@/core/modules';
import type { StoreSpec } from '../stores';
import { APP_ID, EXPORT_FORMAT_VERSION, ExportSchema, checksumOf, seal, type ExportFile, type Row } from './format';

export type ImportErrorCode =
  | 'format' //       no es un .dageprofile legible
  | 'app' //          de otra aplicación
  | 'future' //       más nuevo que esta versión de la app
  | 'checksum' //     contenido alterado o dañado
  | 'unknownStore' // datos de un módulo que esta app no tiene
  | 'owner' //        filas que no pertenecen al perfil del archivo
  | 'exists' //       el perfil ya existe (importar como nuevo)
  | 'missing' //      el perfil a sustituir ya no existe
  | 'notFound'; //    snapshot inexistente

export class ImportError extends Error {
  code: ImportErrorCode;
  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

export interface ParseContext {
  specs: readonly StoreSpec[];
  migrations: readonly ModuleMigration[];
  /** Versión actual del esquema de la base de datos. */
  schemaVersion: number;
}

/** Transacción en memoria sobre las filas de un archivo: las migraciones de módulos funcionan igual que sobre Dexie. */
function memoryTx(stores: Record<string, Row[]>): StoreTx {
  return {
    table: (name) => ({
      toCollection: () => ({
        modify: async (fn) => {
          for (const row of stores[name] ?? []) fn(row);
        },
      }),
    }),
  };
}

export async function migrateStores(
  stores: Record<string, Row[]>,
  fromVersion: number,
  toVersion: number,
  migrations: readonly ModuleMigration[],
): Promise<void> {
  const tx = memoryTx(stores);
  const pending = migrations.filter((m) => m.version > fromVersion && m.version <= toVersion).sort((a, b) => a.version - b.version);
  for (const m of pending) await m.upgrade?.(tx);
}

/**
 * Valida un `.dageprofile` ya parseado: estructura (Zod), aplicación, versiones, checksum, migración
 * si es antiguo, y que todas las filas pertenezcan al perfil del archivo y a tablas registradas.
 */
export async function normalizeExport(raw: unknown, ctx: ParseContext): Promise<{ file: ExportFile; migratedFrom: number | null }> {
  if (typeof raw !== 'object' || raw === null) throw new ImportError('format', 'El archivo no es un perfil de Dragon Age DM Station.');
  const head = raw as { formatVersion?: unknown; schemaVersion?: unknown };
  if (typeof head.formatVersion === 'number' && head.formatVersion > EXPORT_FORMAT_VERSION) {
    throw new ImportError('future', 'El archivo se creó con una versión más nueva de la app. Actualiza la app para importarlo.');
  }
  if (typeof head.schemaVersion === 'number' && head.schemaVersion > ctx.schemaVersion) {
    throw new ImportError('future', 'El archivo se creó con una versión más nueva de la app. Actualiza la app para importarlo.');
  }

  const parsed = ExportSchema.safeParse(raw);
  if (!parsed.success) throw new ImportError('format', 'El archivo no tiene el formato de un perfil válido.');
  const file = structuredClone(parsed.data);
  if (file.app !== APP_ID) throw new ImportError('app', 'El archivo pertenece a otra aplicación.');

  const { checksumSha256, ...body } = file;
  if (checksumOf(body) !== checksumSha256) {
    throw new ImportError('checksum', 'El archivo está dañado o fue modificado: la suma de comprobación no coincide.');
  }

  let migratedFrom: number | null = null;
  if (file.schemaVersion < ctx.schemaVersion) {
    migratedFrom = file.schemaVersion;
    try {
      await migrateStores(file.stores, file.schemaVersion, ctx.schemaVersion, ctx.migrations);
    } catch {
      throw new ImportError('format', 'No se pudieron migrar los datos del archivo a la versión actual.');
    }
    file.schemaVersion = ctx.schemaVersion;
  }

  for (const [table, rows] of Object.entries(file.stores)) {
    const spec = ctx.specs.find((s) => s.table === table);
    if (!spec || !spec.exportable || spec.root || spec.ownerField === null) {
      throw new ImportError('unknownStore', `El archivo contiene datos de un módulo desconocido (${table}).`);
    }
    for (const row of rows) {
      if (row[spec.ownerField] !== file.profile.id) {
        throw new ImportError('owner', 'El archivo contiene datos que no pertenecen a su perfil.');
      }
    }
  }

  const { checksumSha256: _old, ...sealedBody } = file;
  void _old;
  return { file: migratedFrom === null ? file : seal(sealedBody), migratedFrom };
}

export async function parseExportText(text: string, ctx: ParseContext) {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('format', 'El archivo no es un perfil de Dragon Age DM Station.');
  }
  return normalizeExport(raw, ctx);
}
