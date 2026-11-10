import { useCallback, useEffect, useState } from 'react';
import { reloadAndActivate, reloadSettings, useSession } from '@/core/session';
import { saveFile } from '@/core/files';
import { exportProfile, exportSnapshot, listSnapshots, recordBackup, restoreSnapshot, takeSnapshot } from '@/data/exchange/importer';
import type { SnapshotReason, SnapshotRow } from '@/data/types';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmAction } from '@/ui/ConfirmAction';
import { Notice } from '@/ui/Notice';
import { ImportFlow } from '../ImportFlow';

const REASONS: Record<SnapshotReason, string> = {
  manual: 'Copia manual',
  import: 'Antes de importar',
  restore: 'Antes de restaurar',
  migration: 'Antes de actualizar los datos',
};

const fmt = (iso: string) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export function BackupSection() {
  const active = useSession((s) => s.active);
  const settings = useSession((s) => s.settings);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [snaps, setSnaps] = useState<Omit<SnapshotRow, 'data'>[]>([]);
  const profileId = active?.id;
  const revision = active?.revision;

  const [reloadTick, setReloadTick] = useState(0);
  const refresh = useCallback(() => setReloadTick((n) => n + 1), []);
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void listSnapshots(profileId).then((rows) => {
      if (!cancelled) setSnaps(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, revision, reloadTick]);

  if (!active) return null;

  async function doExport() {
    setMessage(null);
    try {
      const out = await exportProfile(active!.id);
      const result = await saveFile(out.filename, out.text);
      if (result === 'cancelled') return;
      await recordBackup(active!.id);
      await reloadSettings();
      setMessage({
        kind: 'ok',
        text: result === 'downloaded' ? `Copia descargada: ${out.filename}` : `Copia guardada: ${out.filename}`,
      });
    } catch {
      setMessage({ kind: 'error', text: 'No se pudo exportar el perfil.' });
    }
  }

  return (
    <>
      <Card title="Copia de seguridad">
        <p>
          {settings?.lastBackupAt ? `Última copia: ${fmt(settings.lastBackupAt)}.` : 'Todavía no has hecho ninguna copia de este perfil.'}{' '}
          Guarda copias de vez en cuando: el navegador puede borrar los datos de una web sin uso (en iOS, si la app no está
          instalada).
        </p>
        {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Button onClick={doExport}>Exportar perfil (.dageprofile)</Button>
          <ImportFlow />
        </div>
      </Card>

      <Card title="Copias locales">
        <p>
          El perfil guarda automáticamente copias antes de sustituirlo (se conservan las 3 últimas). También puedes crear una
          cuando quieras.
        </p>
        {snaps.length === 0 ? <p>No hay copias locales.</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-3)' }}>
          {snaps.map((s) => (
            <li key={s.id} data-testid="snapshot">
              <strong>{REASONS[s.reason]}</strong> · {fmt(s.createdAt)} · revisión {s.revision}
              <div style={{ marginTop: 'var(--space-2)', display: 'grid', gap: 'var(--space-2)' }}>
                {s.reason === 'migration' ? (
                  <small>
                    Copia de seguridad previa a una actualización de datos. Guárdala como archivo: restaurarla aplicaría de nuevo la
                    actualización.
                  </small>
                ) : (
                  <ConfirmAction
                  label="Restaurar"
                  confirmLabel="Restaurar"
                  variant="secondary"
                  message="Se sustituirán los datos actuales del perfil por los de esta copia. El estado actual se guarda antes como otra copia."
                  onConfirm={async () => {
                    await restoreSnapshot(active.id, s.id);
                    await reloadAndActivate(active.id);
                    refresh();
                    setMessage({ kind: 'ok', text: 'Copia restaurada.' });
                  }}
                  />
                )}
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const out = await exportSnapshot(active.id, s.id);
                    const result = await saveFile(out.filename, out.text);
                    if (result !== 'cancelled') setMessage({ kind: 'ok', text: `Copia guardada como archivo: ${out.filename}` });
                  }}
                >
                  Guardar como archivo
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          onClick={async () => {
            await takeSnapshot(active.id);
            refresh();
          }}
        >
          Crear copia local ahora
        </Button>
      </Card>
    </>
  );
}
