import { useState } from 'react';
import { KeyError } from '@/core/keys/dagekey';
import { installKey, uninstallKey, useSession } from '@/core/session';
import { Card } from '@/ui/Card';
import { ConfirmAction } from '@/ui/ConfirmAction';
import { FilePicker } from '@/ui/FilePicker';
import { Notice } from '@/ui/Notice';

export const PERMISSION_LABELS: Record<string, string> = {
  'dm.compendium': 'Compendio del DJ',
  'dm.campaigns': 'Campañas',
  'dm.combat': 'Combate',
  'dm.encounters': 'Encuentros',
  'dm.tools': 'Herramientas del DJ',
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'long' });

export function KeySection() {
  const active = useSession((s) => s.active);
  const key = useSession((s) => s.key);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (!active) return null;

  async function onFile(file: File) {
    setError(null);
    setDone(false);
    try {
      await installKey(new Uint8Array(await file.arrayBuffer()));
      setDone(true);
    } catch (e) {
      setError(e instanceof KeyError ? e.message : 'No se pudo leer la llave.');
    }
  }

  return (
    <Card title="Llave del DJ">
      {key.status === 'valid' ? (
        <>
          <Notice kind="ok">
            Llave válida. Puedes usar el Modo Jugador y el Modo DJ
            {key.claims.expiresAt ? ` hasta el ${fmt(key.claims.expiresAt)}` : ' (sin caducidad)'}.
          </Notice>
          <p>Permisos concedidos:</p>
          <ul>
            {key.claims.permissions.map((p) => (
              <li key={p}>{PERMISSION_LABELS[p] ?? p}</li>
            ))}
          </ul>
        </>
      ) : key.status === 'invalid' ? (
        <Notice kind="error">La llave guardada ya no es válida: {key.message} El Modo DJ está desactivado.</Notice>
      ) : (
        <p>Sin llave. El Modo DJ necesita una llave (.dagekey) emitida para este perfil.</p>
      )}

      {key.status !== 'valid' ? <p>Para pedir una llave, envía al DJ responsable el ID de este perfil (arriba, en «Tu perfil»).</p> : null}

      {error ? <Notice kind="error">{error}</Notice> : null}
      {done ? <Notice kind="ok">Llave instalada.</Notice> : null}

      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <FilePicker label={key.status === 'none' ? 'Importar llave' : 'Importar otra llave'} onFile={onFile} />
        {key.status !== 'none' ? (
          <ConfirmAction
            label="Quitar la llave"
            confirmLabel="Quitar"
            variant="secondary"
            message="Se desactivará el Modo DJ en este perfil. Podrás volver a importar la llave."
            onConfirm={async () => {
              await uninstallKey();
              setDone(false);
            }}
          />
        ) : null}
      </div>
      <p>
        <small>
          La llave separa la experiencia de juego y de dirección; no protege un secreto. Quien copie tu perfil copia también
          su llave, la caducidad depende del reloj del dispositivo y no hay revocación remota.
        </small>
      </p>
    </Card>
  );
}
