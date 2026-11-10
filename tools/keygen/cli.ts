/**
 * Lógica de `tools/keygen`: pares de claves Ed25519 y archivos `.dagekey`.
 * Se ejecuta con Node (type stripping): `npm run keygen -- <init|issue|verify> ...`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  KeyError,
  PERMISSIONS,
  bytesToHex,
  encodeDageKey,
  generateKeyPair,
  hexToBytes,
  isPermission,
  verifyDageKey,
  type Permission,
} from '../../src/core/keys/dagekey.ts';

export interface Io {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

interface PrivateKeyFile {
  keyId: number;
  secretKeyHex: string;
  publicKeyHex: string;
  createdAt: string;
}

const HELP = `Uso: npm run keygen -- <comando> [opciones]

  init    --key <id> [--secrets <dir>] [--force]
          Genera un par de claves y guarda la privada en <dir>/key-<id>.dagekey.private (por defecto ./secrets, fuera de git).
          Imprime la clave pública que hay que añadir a src/core/keys/trustedKeys.ts.

  issue   --profile <idPerfil> [--key <id>] [--expires <fecha ISO>] [--permissions a,b,c] [--out <archivo>] [--secrets <dir>]
          Emite una llave .dagekey para un perfil. Sin --permissions concede todos: ${PERMISSIONS.join(', ')}.

  verify  --file <archivo.dagekey> --profile <idPerfil> [--key-file <privada>] [--secrets <dir>]
          Comprueba una llave contra la clave pública de su keyId.
`;

function randomHex(bytes: number): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

function keyPath(secrets: string, keyId: number): string {
  return join(secrets, `key-${keyId}.dagekey.private`);
}

function loadPrivate(path: string): PrivateKeyFile {
  if (!existsSync(path)) throw new Error(`No existe la clave privada: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as PrivateKeyFile;
}

function parseKeyId(raw: string | undefined, fallback?: number): number {
  const v = raw === undefined ? fallback : Number(raw);
  if (v === undefined || !Number.isInteger(v) || v < 0 || v > 255) throw new Error('--key debe ser un entero entre 0 y 255');
  return v;
}

function parseExpiry(raw: string): string {
  const t = Date.parse(raw);
  if (Number.isNaN(t)) throw new Error(`Fecha de caducidad inválida: ${raw}`);
  // Una fecha sin hora ("2027-12-31") caduca al final de ese día (UTC).
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(t + 24 * 3600_000 - 1).toISOString() : new Date(t).toISOString();
}

export function run(argv: string[], io: Io = { log: console.log, error: console.error }): number {
  const [command, ...rest] = argv;
  try {
    const { values } = parseArgs({
      args: rest,
      options: {
        key: { type: 'string' },
        secrets: { type: 'string' },
        force: { type: 'boolean' },
        profile: { type: 'string' },
        expires: { type: 'string' },
        permissions: { type: 'string' },
        out: { type: 'string' },
        file: { type: 'string' },
        'key-file': { type: 'string' },
      },
    });
    const secrets = resolve(values.secrets ?? 'secrets');

    if (command === 'init') {
      const keyId = parseKeyId(values.key);
      const path = keyPath(secrets, keyId);
      if (existsSync(path) && !values.force) throw new Error(`Ya existe ${path}. Usa --force solo si quieres perderla.`);
      const { secretKey, publicKey } = generateKeyPair();
      const file: PrivateKeyFile = {
        keyId,
        secretKeyHex: bytesToHex(secretKey),
        publicKeyHex: bytesToHex(publicKey),
        createdAt: new Date().toISOString(),
      };
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(file, null, 2) + '\n', { mode: 0o600 });
      io.log(`Clave privada guardada en ${path} (no la subas a git; haz copia en un lugar seguro).`);
      io.log(`Clave pública del keyId ${keyId}: ${file.publicKeyHex}`);
      io.log(`Añádela a TRUSTED_KEYS en src/core/keys/trustedKeys.ts:  ${keyId}: '${file.publicKeyHex}'`);
      return 0;
    }

    if (command === 'issue') {
      if (!values.profile) throw new Error('Falta --profile <idPerfil> (cópialo desde la pantalla de perfil de la app)');
      const keyId = parseKeyId(values.key, 1);
      const priv = loadPrivate(keyPath(secrets, keyId));
      const permissions = values.permissions
        ? values.permissions.split(',').map((p) => p.trim()).filter(Boolean)
        : [...PERMISSIONS];
      const bad = permissions.filter((p) => !isPermission(p));
      if (bad.length > 0) throw new Error(`Permisos desconocidos: ${bad.join(', ')}. Válidos: ${PERMISSIONS.join(', ')}`);
      const expiresAt = values.expires ? parseExpiry(values.expires) : undefined;
      const bytes = encodeDageKey(
        { authId: randomHex(16), profileId: values.profile, permissions: permissions as Permission[], ...(expiresAt ? { expiresAt } : {}) },
        priv.keyId,
        hexToBytes(priv.secretKeyHex),
      );
      const out = resolve(values.out ?? `${values.profile}.dagekey`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, bytes);
      io.log(`Llave emitida: ${out}`);
      io.log(`Perfil: ${values.profile} · permisos: ${permissions.join(', ')} · caduca: ${expiresAt ?? 'nunca'}`);
      return 0;
    }

    if (command === 'verify') {
      if (!values.file || !values.profile) throw new Error('Faltan --file y --profile');
      const bytes = new Uint8Array(readFileSync(values.file));
      const keyId = bytes[9] ?? 0;
      const priv = loadPrivate(values['key-file'] ?? keyPath(secrets, keyId));
      const claims = verifyDageKey(bytes, { trusted: { [priv.keyId]: priv.publicKeyHex }, profileId: values.profile });
      io.log(`Válida. Permisos: ${claims.permissions.join(', ')} · caduca: ${claims.expiresAt ?? 'nunca'}`);
      return 0;
    }

    io.log(HELP);
    return command === undefined || command === 'help' ? 0 : 1;
  } catch (e) {
    io.error(e instanceof KeyError ? `Llave inválida (${e.code}): ${e.message}` : `Error: ${(e as Error).message}`);
    return 1;
  }
}

