/**
 * Formato `.dagekey` v1 (binario). Ver docs/SECURITY.md y docs/adr/0002-perfiles-llave-y-datos.md.
 *
 *   "DAGEKEY1" (8) | u8 formatVersion | u8 keyId | u32 payloadLen (big-endian) | payload JSON UTF-8 | firma Ed25519 (64)
 *
 * La firma cubre todo lo anterior (cabecera + payload).
 *
 * Este archivo lo usan la app y `tools/keygen` (Node ejecuta TypeScript con type stripping):
 * por eso solo importa paquetes npm, nunca módulos del proyecto, y usa solo sintaxis borrable.
 * Usa SHA-512 síncrono de @noble/hashes: `crypto.subtle` no existe en HTTP sin contexto seguro (pruebas por LAN).
 */
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { z } from 'zod';

ed.hashes.sha512 = sha512;

export const APP_ID = 'dragon-age-dm-station';
export const FORMAT_VERSION = 1;
export const PERMISSIONS = ['dm.compendium', 'dm.campaigns', 'dm.combat', 'dm.encounters', 'dm.tools'] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MAGIC = 'DAGEKEY1';
const HEADER_LEN = 14; // 8 magic + 1 versión + 1 keyId + 4 longitud
const SIG_LEN = 64;

export type KeyErrorCode =
  | 'format' //     no es un .dagekey
  | 'truncated' //  incompleto
  | 'version' //    formatVersion no soportada
  | 'unknownKey' // keyId sin clave pública conocida
  | 'signature' //  firma incorrecta (archivo manipulado o firmado por otra clave)
  | 'payload' //    el contenido firmado no es válido
  | 'app' //        pertenece a otra aplicación
  | 'profile' //    ligada a otro perfil
  | 'expired' //    caducada
  | 'noPermissions'; // no concede ningún permiso conocido

export class KeyError extends Error {
  code: KeyErrorCode;
  constructor(code: KeyErrorCode, message: string) {
    super(message);
    this.name = 'KeyError';
    this.code = code;
  }
}

export interface KeyClaims {
  authId: string;
  profileId: string;
  app: string;
  issuedAt: string;
  expiresAt?: string;
  permissions: Permission[];
}

/** Mapa keyId → clave pública Ed25519 (hex de 64 caracteres). Permite rotar claves sin cambiar el formato. */
export type TrustedKeys = Readonly<Record<number, string>>;

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'fecha inválida');
const PayloadSchema = z.object({
  authId: z.string().min(1),
  profileId: z.string().min(1),
  app: z.string(),
  issuedAt: isoDate,
  expiresAt: isoDate.optional(),
  permissions: z.array(z.string()),
});

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^([0-9a-f]{2})*$/i.test(hex)) throw new Error('Hexadecimal inválido');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function isPermission(p: string): p is Permission {
  return (PERMISSIONS as readonly string[]).includes(p);
}

export interface NewKeyClaims {
  authId: string;
  profileId: string;
  issuedAt?: string;
  expiresAt?: string;
  permissions?: readonly Permission[];
}

/** Firma una llave. Lo usa `tools/keygen`; la app nunca tiene la clave privada. */
export function encodeDageKey(claims: NewKeyClaims, keyId: number, secretKey: Uint8Array): Uint8Array {
  if (!Number.isInteger(keyId) || keyId < 0 || keyId > 255) throw new Error('keyId fuera de rango (0-255)');
  const payload: Record<string, unknown> = {
    authId: claims.authId,
    profileId: claims.profileId,
    app: APP_ID,
    issuedAt: claims.issuedAt ?? new Date().toISOString(),
    permissions: [...(claims.permissions ?? PERMISSIONS)],
  };
  if (claims.expiresAt) payload.expiresAt = claims.expiresAt;
  return signPayload(payload, keyId, secretKey);
}

/** Empaqueta y firma un payload arbitrario (cabecera + JSON + firma). Los tests lo usan para fabricar llaves defectuosas. */
export function signPayload(payload: unknown, keyId: number, secretKey: Uint8Array): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const signed = new Uint8Array(HEADER_LEN + body.length);
  signed.set(new TextEncoder().encode(MAGIC), 0);
  signed[8] = FORMAT_VERSION;
  signed[9] = keyId;
  new DataView(signed.buffer).setUint32(10, body.length, false);
  signed.set(body, HEADER_LEN);

  const out = new Uint8Array(signed.length + SIG_LEN);
  out.set(signed, 0);
  out.set(ed.sign(signed, secretKey), signed.length);
  return out;
}

export interface VerifyContext {
  trusted: TrustedKeys;
  /** Perfil para el que se valida la llave. */
  profileId: string;
  now?: Date;
}

/** Valida una llave y devuelve sus permisos, o lanza `KeyError` con el motivo. */
export function verifyDageKey(bytes: Uint8Array, ctx: VerifyContext): KeyClaims {
  const magic = new TextEncoder().encode(MAGIC);
  const n = Math.min(bytes.length, magic.length);
  for (let i = 0; i < n; i++) {
    if (bytes[i] !== magic[i]) throw new KeyError('format', 'El archivo no es una llave .dagekey.');
  }
  if (bytes.length < HEADER_LEN + SIG_LEN) throw new KeyError('truncated', 'La llave está incompleta.');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const formatVersion = bytes[8]!;
  if (formatVersion !== FORMAT_VERSION) throw new KeyError('version', `Versión de llave no soportada (${formatVersion}).`);

  const keyId = bytes[9]!;
  const publicKeyHex = Object.hasOwn(ctx.trusted, keyId) ? ctx.trusted[keyId] : undefined;
  if (!publicKeyHex) throw new KeyError('unknownKey', `La llave usa una clave de firma desconocida (${keyId}).`);

  const payloadLen = view.getUint32(10, false);
  const expected = HEADER_LEN + payloadLen + SIG_LEN;
  if (bytes.length < expected) throw new KeyError('truncated', 'La llave está incompleta.');
  if (bytes.length > expected) throw new KeyError('format', 'La llave contiene datos sobrantes.');

  const signed = bytes.subarray(0, HEADER_LEN + payloadLen);
  const signature = bytes.subarray(HEADER_LEN + payloadLen);
  let ok: boolean;
  try {
    ok = ed.verify(signature, signed, hexToBytes(publicKeyHex));
  } catch {
    ok = false;
  }
  if (!ok) throw new KeyError('signature', 'La firma de la llave no es válida.');

  let parsed: z.infer<typeof PayloadSchema>;
  try {
    const json: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(HEADER_LEN, HEADER_LEN + payloadLen)));
    parsed = PayloadSchema.parse(json);
  } catch {
    throw new KeyError('payload', 'El contenido de la llave no es válido.');
  }

  if (parsed.app !== APP_ID) throw new KeyError('app', 'La llave pertenece a otra aplicación.');
  if (parsed.profileId !== ctx.profileId) throw new KeyError('profile', 'La llave está emitida para otro perfil.');
  const now = (ctx.now ?? new Date()).getTime();
  if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= now) throw new KeyError('expired', 'La llave ha caducado.');

  const permissions = [...new Set(parsed.permissions.filter(isPermission))];
  if (permissions.length === 0) throw new KeyError('noPermissions', 'La llave no concede ningún permiso.');

  return {
    authId: parsed.authId,
    profileId: parsed.profileId,
    app: parsed.app,
    issuedAt: parsed.issuedAt,
    ...(parsed.expiresAt ? { expiresAt: parsed.expiresAt } : {}),
    permissions,
  };
}

export function generateKeyPair(): { secretKey: Uint8Array; publicKey: Uint8Array } {
  const secretKey = ed.utils.randomSecretKey();
  return { secretKey, publicKey: ed.getPublicKey(secretKey) };
}

export function publicKeyOf(secretKey: Uint8Array): Uint8Array {
  return ed.getPublicKey(secretKey);
}
