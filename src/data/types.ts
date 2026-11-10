import type { ExportFile } from './exchange/format';

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  /** Se incrementa en cada cambio de los datos del perfil; sirve para detectar versiones más antiguas al importar. */
  revision: number;
}

export type TextScale = 'normal' | 'large' | 'xlarge';
export type BackupReminderDays = 0 | 7 | 30;

export interface SettingsRow {
  ownerProfileId: string;
  textScale: TextScale;
  /** 0 = sin recordatorio. */
  backupReminderDays: BackupReminderDays;
  /** Última exportación `.dageprofile` de este perfil. */
  lastBackupAt?: string;
}

export interface CredentialRow {
  ownerProfileId: string;
  /** Bytes del `.dagekey` firmado, en base64. Se guarda la credencial, nunca un booleano. */
  bytes: string;
  installedAt: string;
}

export type SnapshotReason = 'manual' | 'import' | 'restore' | 'migration';

export interface SnapshotRow {
  ownerProfileId: string;
  id: string;
  createdAt: string;
  reason: SnapshotReason;
  revision: number;
  /** Contenido completo del perfil en el formato `.dageprofile`. */
  data: ExportFile;
}

export const MAX_SNAPSHOTS_PER_PROFILE = 3;
