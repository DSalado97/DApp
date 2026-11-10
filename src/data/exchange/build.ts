import type { Table } from 'dexie';
import { newId } from '../encoding';
import { MAX_SNAPSHOTS_PER_PROFILE, type Profile, type SnapshotReason, type SnapshotRow } from '../types';
import type { StoreSpec } from '../stores';
import { APP_ID, EXPORT_FORMAT, EXPORT_FORMAT_VERSION, seal, type ExportFile, type Row } from './format';

/** Lo común a `Dexie` y a `Transaction`: permite usar las mismas funciones dentro y fuera de transacciones. */
export interface TableSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table(name: string): Table<any, any>;
}

const exportable = (specs: readonly StoreSpec[]) => specs.filter((s) => s.exportable && !s.root && s.ownerField !== null);

/** Lee las filas del perfil de todos los stores exportables, recorriendo el registro. */
export async function readProfileStores(src: TableSource, specs: readonly StoreSpec[], profileId: string): Promise<Record<string, Row[]>> {
  const stores: Record<string, Row[]> = {};
  for (const s of exportable(specs)) {
    stores[s.table] = (await src.table(s.table).where(s.ownerField!).equals(profileId).toArray()) as Row[];
  }
  return stores;
}

export interface BuildContext {
  specs: readonly StoreSpec[];
  schemaVersion: number;
  deviceId: string;
  now?: Date;
}

/** Construye el contenido `.dageprofile` de un perfil desde el registro de stores. */
export async function buildExport(src: TableSource, ctx: BuildContext, profileId: string): Promise<ExportFile> {
  const profile = (await src.table('profiles').get(profileId)) as Profile | undefined;
  if (!profile) throw new Error('El perfil no existe');
  return seal({
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: ctx.schemaVersion,
    exportedAt: (ctx.now ?? new Date()).toISOString(),
    app: APP_ID,
    deviceId: ctx.deviceId,
    profile: { id: profile.id, name: profile.name, createdAt: profile.createdAt },
    revision: profile.revision,
    modifiedAt: profile.modifiedAt,
    stores: await readProfileStores(src, ctx.specs, profileId),
    assets: {},
  });
}

/** Borra todas las filas del perfil en todos los stores registrados (cascada). Con `keepSnapshots` conserva sus copias. */
export async function deleteProfileRows(
  src: TableSource,
  specs: readonly StoreSpec[],
  profileId: string,
  opts: { keepSnapshots?: boolean; keepProfile?: boolean } = {},
): Promise<void> {
  for (const s of specs) {
    if (s.ownerField === null) continue;
    if (opts.keepSnapshots && s.table === 'snapshots') continue;
    if (opts.keepProfile && s.root) continue;
    const t = src.table(s.table);
    if (s.root) await t.delete(profileId);
    else await t.where(s.ownerField).equals(profileId).delete();
  }
}

/** Más reciente primero; a igual fecha (mismo milisegundo) decide la revisión. */
export function newestFirst(a: Pick<SnapshotRow, 'createdAt' | 'revision'>, b: Pick<SnapshotRow, 'createdAt' | 'revision'>): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return b.revision - a.revision;
}

/** Guarda un snapshot del perfil y conserva solo los últimos 3. */
export async function createSnapshot(
  src: TableSource,
  ctx: BuildContext,
  profileId: string,
  reason: SnapshotReason,
): Promise<SnapshotRow> {
  const data = await buildExport(src, ctx, profileId);
  const row: SnapshotRow = {
    ownerProfileId: profileId,
    id: newId(),
    createdAt: (ctx.now ?? new Date()).toISOString(),
    reason,
    revision: data.revision,
    data,
  };
  const table = src.table('snapshots');
  await table.put(row);
  const all = (await table.where('ownerProfileId').equals(profileId).toArray()) as SnapshotRow[];
  all.sort(newestFirst);
  for (const old of all.slice(MAX_SNAPSHOTS_PER_PROFILE)) await table.delete([old.ownerProfileId, old.id]);
  return row;
}
