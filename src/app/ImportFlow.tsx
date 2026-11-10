import { useState } from 'react';
import { reloadAndActivate } from '@/core/session';
import { analyzeImport, applyImport, type ImportAnalysis, type ImportMode } from '@/data/exchange/importer';
import { ImportError } from '@/data/exchange/parse';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { FilePicker } from '@/ui/FilePicker';
import { ConfirmAction } from '@/ui/ConfirmAction';
import { Notice } from '@/ui/Notice';

const STORE_LABELS: Record<string, string> = { credentials: 'Llave del DJ', settings: 'Ajustes' };

const fmt = (iso: string) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

const RELATION_TEXT = {
  identical: { kind: 'info', text: 'Es idéntico al perfil que ya tienes. Sustituirlo no cambiaría nada.' },
  newer: { kind: 'ok', text: 'Es más reciente que el perfil que ya tienes con este ID.' },
  older: { kind: 'warn', text: 'Es más antiguo que el perfil que ya tienes con este ID: sustituirlo perdería cambios posteriores.' },
  divergent: { kind: 'warn', text: 'Ha evolucionado por separado del perfil que ya tienes con este ID: no hay fusión automática, elige con cuidado.' },
} as const;

/** Flujo de importación de `.dageprofile`: validar → resumen → conflicto → aplicar. */
export function ImportFlow({ onDone, onCancel }: { onDone?: (profileId: string) => void; onCancel?: () => void }) {
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    setError(null);
    setAnalysis(null);
    try {
      setAnalysis(await analyzeImport(await file.text()));
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'No se pudo leer el archivo.');
    }
  }

  async function apply(mode: ImportMode) {
    if (!analysis) return;
    setBusy(true);
    setError(null);
    try {
      const { profileId } = await applyImport(analysis, mode);
      await reloadAndActivate(profileId);
      setAnalysis(null);
      onDone?.(profileId);
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'No se pudo importar el perfil.');
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setAnalysis(null);
    setError(null);
    onCancel?.();
  }

  return (
    <div>
      <FilePicker label="Importar perfil desde archivo" onFile={pick} disabled={busy} />
      {error ? (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Notice kind="error">{error}</Notice>
        </div>
      ) : null}
      {analysis ? <Summary analysis={analysis} busy={busy} onApply={apply} onCancel={cancel} /> : null}
    </div>
  );
}

function Summary({
  analysis,
  busy,
  onApply,
  onCancel,
}: {
  analysis: ImportAnalysis;
  busy: boolean;
  onApply: (mode: ImportMode) => void;
  onCancel: () => void;
}) {
  const { file, existing, relation, counts, hasKey, migratedFrom } = analysis;
  const rel = relation ? RELATION_TEXT[relation] : null;
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  const independentMessage = hasKey
    ? 'Se creará un perfil nuevo con otro ID y se descartará la llave: está firmada para el ID original y no serviría.'
    : 'Se creará un perfil nuevo con otro ID, sin tocar el que ya tienes.';

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <Card title={`Perfil «${file.profile.name}»`}>
        <p>
          Exportado el {fmt(file.exportedAt)} · revisión {file.revision} · modificado el {fmt(file.modifiedAt)}.
        </p>
        {entries.length > 0 ? (
          <ul>
            {entries.map(([t, n]) => (
              <li key={t}>
                {STORE_LABELS[t] ?? t}: {n}
              </li>
            ))}
          </ul>
        ) : null}
        {migratedFrom !== null ? <Notice>El archivo es de una versión anterior y se ha actualizado al importarlo.</Notice> : null}
        {hasKey ? <Notice>Incluye una llave del DJ.</Notice> : null}
        {existing && rel ? (
          <Notice kind={rel.kind}>
            Ya existe «{existing.name}» (revisión {existing.revision}). {rel.text}
          </Notice>
        ) : null}

        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {!existing ? (
            <Button disabled={busy} onClick={() => onApply('new')}>
              Importar perfil
            </Button>
          ) : (
            <ConfirmAction
              label="Sustituir el perfil existente"
              confirmLabel="Sustituir"
              message={`Se sustituirán todos los datos de «${existing.name}». Antes se guarda una copia local automática, restaurable desde Perfil.`}
              onConfirm={() => onApply('replace')}
            />
          )}
          <ConfirmAction
            label="Importar como perfil independiente"
            confirmLabel="Importar como independiente"
            variant="secondary"
            message={independentMessage}
            onConfirm={() => onApply('independent')}
          />
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
}
