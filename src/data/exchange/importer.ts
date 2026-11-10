import { getConfig, getDb, getDeviceId, getSchemaVersion } from '../db';
import { newId } from '../encoding';
import { markBackup } from '../settings';
import type { Profile, SnapshotReason, SnapshotRow } from '../types';
import { buildExport, createSnapshot, deleteProfileRows, newestFirst, type BuildContext } from './build';
import type { ExportFile, Row } from './format';
import { ImportError, normalizeExport, parseExportText, type ParseContext } from './parse';

const parseCtx = (): ParseContext => ({
  specs: getConfig().stores,
  migrations: getConfig().migrations,
  schemaVersion: getSchemaVersion(),
});

async function buildCtx(): Promise<BuildContext> {
  return { specs: getConfig().stores, schemaVersion: getSchemaVersion(), deviceId: await getDeviceId() };
}

// ───────────────────────────── exportar ─────────────────────────────

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'perfil';

export interface ExportedProfile {
  filename: string;
  text: string;
  file: ExportFile;
}

/** Genera el `.dageprofile` del perfil. La anotación de "última copia" se hace aparte, cuando el archivo se ha guardado de verdad. */
export async function exportProfile(profileId: string, now = new Date()): Promise<ExportedProfile> {
  const file = await buildExport(getDb(), { ...(await buildCtx()), now }, profileId);
  const day = now.toISOString().slice(0, 10);
  return { filename: `${slug(file.profile.name)}-${day}.dageprofile`, text: JSON.stringify(file), file };
}

export function recordBackup(profileId: string): Promise<void> {
  return markBackup(profileId);
}

// ───────────────────────────── importar ─────────────────────────────

export type Relation = 'identical' | 'newer' | 'older' | 'divergent';
export type ImportMode = 'new' | 'replace' | 'independent';

export interface ImportAnalysis {
  file: ExportFile;
  /** Versión de esquema original si el archivo se ha migrado. */
  migratedFrom: number | null;
  existing: Profile | null;
  /** Cómo se compara el archivo con el perfil existente con el mismo ID. */
  relation: Relation | null;
  counts: Record<string, number>;
  hasKey: boolean;
}

export function compareWithExisting(incoming: { revision: number; modifiedAt: string }, existing: Profile): Relation {
  if (incoming.revision === existing.revision && incoming.modifiedAt === existing.modifiedAt) return 'identical';
  const ti = Date.parse(incoming.modifiedAt);
  const te = Date.parse(existing.modifiedAt);
  if (incoming.revision > existing.revision && ti >= te) return 'newer';
  if (incoming.revision < existing.revision && ti <= te) return 'older';
  return 'divergent';
}

/** Pasos 1-4 de la importación: leer, validar, migrar, resumir y detectar conflicto. No escribe nada. */
export async function analyzeImport(text: string): Promise<ImportAnalysis> {
  const { file, migratedFrom } = await parseExportText(text, parseCtx());
  return describe(file, migratedFrom);
}

async function describe(file: ExportFile, migratedFrom: number | null): Promise<ImportAnalysis> {
  const existing = (await getDb().table<Profile, string>('profiles').get(file.profile.id)) ?? null;
  return {
    file,
    migratedFrom,
    existing,
    relation: existing ? compareWithExisting(file, existing) : null,
    counts: Object.fromEntries(Object.entries(file.stores).map(([t, rows]) => [t, rows.length])),
    hasKey: (file.stores.credentials?.length ?? 0) > 0,
  };
}

interface WriteOpts {
  mode: ImportMode | 'restore';
  /** Id destino y nombre cuando el modo es `independent`. */
  independent?: { id: string; name: string };
  /** Revisión a fijar al restaurar (la actual + 1). */
  revision?: number;
}

async function writeFile(file: ExportFile, opts: WriteOpts): Promise<string> {
  const db = getDb();
  const { stores: specs } = getConfig();
  const independent = opts.mode === 'independent' ? opts.independent! : null;
  const targetId = independent?.id ?? file.profile.id;
  const now = new Date().toISOString();

  const profile: Profile = independent
    ? { id: targetId, name: independent.name, createdAt: now, modifiedAt: now, revision: 1 }
    : {
        id: targetId,
        name: file.profile.name,
        createdAt: file.profile.createdAt,
        modifiedAt: opts.mode === 'restore' ? now : file.modifiedAt,
        revision: opts.revision ?? file.revision,
      };
  await db.table('profiles').put(profile);

  for (const [table, rows] of Object.entries(file.stores)) {
    const spec = specs.find((s) => s.table === table)!;
    if (independent && spec.profileBound) continue; // la credencial va firmada para otro ID
    const out = rows.map((r): Row => (independent ? { ...r, [spec.ownerField!]: targetId } : r));
    await db.table(table).bulkPut(out);
  }
  return targetId;
}

/**
 * Paso 5-6: aplica el análisis en una única transacción.
 * - `new`: el ID no existe. - `replace`: el ID existe; se guarda antes un snapshot automático.
 * - `independent`: ID nuevo, sin la credencial (que está ligada al ID original).
 */
export async function applyImport(analysis: ImportAnalysis, mode: ImportMode): Promise<{ profileId: string }> {
  const db = getDb();
  const specs = getConfig().stores;
  const ctx = await buildCtx();
  const { file } = analysis;

  return db.transaction('rw', db.tables, async () => {
    const existing = await db.table<Profile, string>('profiles').get(file.profile.id);

    if (mode === 'independent') {
      const name = existing ? `${file.profile.name} (copia)`.slice(0, 40) : file.profile.name;
      return { profileId: await writeFile(file, { mode, independent: { id: newId(), name } }) };
    }
    if (mode === 'new') {
      if (existing) throw new ImportError('exists', 'Ya existe un perfil con ese ID.');
      return { profileId: await writeFile(file, { mode }) };
    }
    if (!existing) throw new ImportError('missing', 'El perfil que ibas a sustituir ya no existe.');
    await createSnapshot(db, ctx, existing.id, 'import');
    await deleteProfileRows(db, specs, existing.id, { keepSnapshots: true, keepProfile: true });
    return { profileId: await writeFile(file, { mode }) };
  });
}

// ───────────────────────────── snapshots ─────────────────────────────

export async function listSnapshots(profileId: string): Promise<Omit<SnapshotRow, 'data'>[]> {
  const rows = await getDb().table<SnapshotRow, [string, string]>('snapshots').where('ownerProfileId').equals(profileId).toArray();
  return rows
    .sort(newestFirst)
    .map(({ data: _data, ...rest }) => {
      void _data;
      return rest;
    });
}

export async function takeSnapshot(profileId: string, reason: SnapshotReason = 'manual'): Promise<SnapshotRow> {
  const db = getDb();
  const ctx = await buildCtx();
  return db.transaction('rw', db.tables, async () => createSnapshot(db, ctx, profileId, reason));
}

/** Restaura un snapshot sobre su perfil. Antes guarda el estado actual como otro snapshot. */
export async function restoreSnapshot(profileId: string, snapshotId: string): Promise<void> {
  const db = getDb();
  const snap = await db.table<SnapshotRow, [string, string]>('snapshots').get([profileId, snapshotId]);
  if (!snap) throw new ImportError('notFound', 'La copia ya no existe.');
  const { file } = await normalizeExport(snap.data, parseCtx());
  const ctx = await buildCtx();
  const specs = getConfig().stores;

  await db.transaction('rw', db.tables, async () => {
    const current = await db.table<Profile, string>('profiles').get(profileId);
    if (!current) throw new ImportError('missing', 'El perfil ya no existe.');
    await createSnapshot(db, ctx, profileId, 'restore');
    await deleteProfileRows(db, specs, profileId, { keepSnapshots: true, keepProfile: true });
    await writeFile(file, { mode: 'restore', revision: current.revision + 1 });
  });
}

/**
 * El snapshot como archivo `.dageprofile`. Es la vía de recuperación de los snapshots previos a una migración
 * destructiva: restaurarlos aplicaría otra vez la migración, así que se guardan como archivo.
 */
export async function exportSnapshot(profileId: string, snapshotId: string): Promise<ExportedProfile> {
  const snap = await getDb().table<SnapshotRow, [string, string]>('snapshots').get([profileId, snapshotId]);
  if (!snap) throw new ImportError('notFound', 'La copia ya no existe.');
  const day = snap.createdAt.slice(0, 10);
  return { filename: `${slug(snap.data.profile.name)}-copia-${day}.dageprofile`, text: JSON.stringify(snap.data), file: snap.data };
}

export async function deleteSnapshot(profileId: string, snapshotId: string): Promise<void> {
  await getDb().table('snapshots').delete([profileId, snapshotId]);
}
