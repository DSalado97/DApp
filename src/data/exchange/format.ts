import { sha256 } from '@noble/hashes/sha2.js';
import { z } from 'zod';

export { APP_ID } from '@/core/keys/dagekey';
export const EXPORT_FORMAT = 'dageprofile';
export const EXPORT_FORMAT_VERSION = 1;

export type Row = Record<string, unknown>;

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'fecha inválida');

export const ExportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
  exportedAt: isoDate,
  app: z.string(),
  deviceId: z.string(),
  profile: z.object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(120),
    createdAt: isoDate,
  }),
  revision: z.number().int().min(1),
  modifiedAt: isoDate,
  stores: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  /** Binarios (retratos, etc.) en base64. Vacío hasta que un módulo los use. */
  assets: z.record(z.string(), z.string()),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type ExportFile = z.infer<typeof ExportSchema>;
export type ExportBody = Omit<ExportFile, 'checksumSha256'>;

/** JSON con claves ordenadas: mismo contenido → mismos bytes → mismo checksum. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const parts = Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${parts.join(',')}}`;
}

export function checksumOf(body: ExportBody): string {
  const hash = sha256(new TextEncoder().encode(canonicalJson(body)));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function seal(body: ExportBody): ExportFile {
  return { ...body, checksumSha256: checksumOf(body) };
}
