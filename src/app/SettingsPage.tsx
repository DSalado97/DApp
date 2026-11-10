import { useEffect, useState } from 'react';
import { changeSettings, useSession } from '@/core/session';
import { getStorageStatus, requestPersistence, type StorageStatus } from '@/core/storage';
import type { BackupReminderDays, TextScale } from '@/data/types';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import styles from './SettingsPage.module.css';

const SCALES: { value: TextScale; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Muy grande' },
];

const REMINDERS: { value: BackupReminderDays; label: string }[] = [
  { value: 0, label: 'Nunca' },
  { value: 7, label: 'Cada 7 días' },
  { value: 30, label: 'Cada 30 días' },
];

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export function SettingsPage() {
  const settings = useSession((s) => s.settings);
  const [storage, setStorage] = useState<StorageStatus | null>(null);

  useEffect(() => {
    void getStorageStatus().then(setStorage);
  }, []);

  if (!settings) return null;

  return (
    <>
      <Card title="Tamaño del texto">
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Tamaño del texto de la aplicación</legend>
          {SCALES.map((o) => (
            <label key={o.value} className={styles.option}>
              <input
                type="radio"
                name="textScale"
                checked={settings.textScale === o.value}
                onChange={() => void changeSettings({ textScale: o.value })}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      </Card>

      <Card title="Recordatorio de copia de seguridad">
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Avisarme si no hago una copia</legend>
          {REMINDERS.map((o) => (
            <label key={o.value} className={styles.option}>
              <input
                type="radio"
                name="backupReminder"
                checked={settings.backupReminderDays === o.value}
                onChange={() => void changeSettings({ backupReminderDays: o.value })}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      </Card>

      <Card title="Almacenamiento">
        {storage ? (
          <>
            <p>
              Almacenamiento persistente:{' '}
              <strong>{storage.persisted === null ? 'no disponible en este navegador' : storage.persisted ? 'concedido' : 'no concedido'}</strong>.
            </p>
            {storage.usageBytes !== null && storage.quotaBytes !== null ? (
              <p>
                En uso: {mb(storage.usageBytes)} de {mb(storage.quotaBytes)} disponibles.
              </p>
            ) : null}
            {storage.persisted === false ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  await requestPersistence();
                  setStorage(await getStorageStatus());
                }}
              >
                Solicitar almacenamiento persistente
              </Button>
            ) : null}
          </>
        ) : (
          <p>Comprobando…</p>
        )}
        <p>
          <small>
            Sin almacenamiento persistente, el navegador puede borrar los datos si falta espacio. En iOS también puede
            hacerlo si la app no está instalada en la pantalla de inicio y no se usa durante un tiempo. Exporta copias de
            seguridad desde Perfil.
          </small>
        </p>
      </Card>
    </>
  );
}
