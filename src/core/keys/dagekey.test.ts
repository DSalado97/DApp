import { describe, expect, it } from 'vitest';
import {
  KeyError,
  PERMISSIONS,
  bytesToHex,
  encodeDageKey,
  generateKeyPair,
  signPayload,
  verifyDageKey,
  type KeyErrorCode,
  type NewKeyClaims,
} from './dagekey';

const pair = generateKeyPair();
const other = generateKeyPair();
const trusted = { 1: bytesToHex(pair.publicKey) };
const NOW = new Date('2026-11-07T12:00:00Z');
const ctx = { trusted, profileId: 'perfil-1', now: NOW };

const issue = (over: Partial<NewKeyClaims> = {}, keyId = 1, secret = pair.secretKey) =>
  encodeDageKey({ authId: 'auth-1', profileId: 'perfil-1', issuedAt: '2026-01-01T00:00:00Z', ...over }, keyId, secret);

function codeOf(fn: () => unknown): KeyErrorCode {
  try {
    fn();
  } catch (e) {
    if (e instanceof KeyError) return e.code;
    throw e;
  }
  throw new Error('no lanzó KeyError');
}

describe('llave .dagekey', () => {
  it('una llave válida concede todos los permisos por defecto', () => {
    const claims = verifyDageKey(issue(), ctx);
    expect(claims.permissions).toEqual([...PERMISSIONS]);
    expect(claims.profileId).toBe('perfil-1');
    expect(claims.expiresAt).toBeUndefined();
  });

  it('respeta una lista de permisos y una caducidad futura', () => {
    const claims = verifyDageKey(issue({ permissions: ['dm.combat'], expiresAt: '2027-01-01T00:00:00Z' }), ctx);
    expect(claims.permissions).toEqual(['dm.combat']);
    expect(claims.expiresAt).toBe('2027-01-01T00:00:00Z');
  });

  it('usa el formato binario documentado', () => {
    const bytes = issue();
    expect(new TextDecoder().decode(bytes.subarray(0, 8))).toBe('DAGEKEY1');
    expect(bytes[8]).toBe(1); // formatVersion
    expect(bytes[9]).toBe(1); // keyId
    const len = new DataView(bytes.buffer).getUint32(10, false);
    expect(bytes.length).toBe(14 + len + 64);
  });

  it('rechaza una llave truncada en cualquier punto', () => {
    const bytes = issue();
    for (let n = 0; n < bytes.length; n++) {
      expect(['format', 'truncated']).toContain(codeOf(() => verifyDageKey(bytes.slice(0, n), ctx)));
    }
  });

  it('rechaza datos sobrantes', () => {
    const bytes = issue();
    const longer = new Uint8Array(bytes.length + 1);
    longer.set(bytes);
    expect(codeOf(() => verifyDageKey(longer, ctx))).toBe('format');
  });

  it('rechaza cualquier byte manipulado, en todas las zonas', () => {
    const bytes = issue();
    for (let i = 0; i < bytes.length; i++) {
      const copy = bytes.slice();
      copy[i] = copy[i]! ^ 0x01;
      expect(() => verifyDageKey(copy, ctx), `byte ${i}`).toThrow(KeyError);
    }
  });

  it('da el motivo correcto según la zona', () => {
    const bytes = issue();
    const flip = (i: number) => {
      const c = bytes.slice();
      c[i] = c[i]! ^ 0xff;
      return c;
    };
    expect(codeOf(() => verifyDageKey(flip(0), ctx))).toBe('format'); // magic
    expect(codeOf(() => verifyDageKey(flip(8), ctx))).toBe('version');
    expect(codeOf(() => verifyDageKey(flip(9), ctx))).toBe('unknownKey');
    expect(['truncated', 'format']).toContain(codeOf(() => verifyDageKey(flip(13), ctx))); // longitud del payload
    expect(codeOf(() => verifyDageKey(flip(20), ctx))).toBe('signature'); // payload
    expect(codeOf(() => verifyDageKey(flip(bytes.length - 1), ctx))).toBe('signature'); // firma
  });

  it('rechaza una firma de otra clave', () => {
    expect(codeOf(() => verifyDageKey(issue({}, 1, other.secretKey), ctx))).toBe('signature');
  });

  it('rechaza un keyId desconocido aunque la firma sea buena', () => {
    expect(codeOf(() => verifyDageKey(issue({}, 7), ctx))).toBe('unknownKey');
  });

  it('acepta rotación: dos keyId conviven', () => {
    const both = { ...trusted, 2: bytesToHex(other.publicKey) };
    expect(verifyDageKey(issue({}, 2, other.secretKey), { ...ctx, trusted: both }).profileId).toBe('perfil-1');
    expect(verifyDageKey(issue(), { ...ctx, trusted: both }).profileId).toBe('perfil-1');
  });

  it('rechaza una llave emitida para otro perfil', () => {
    expect(codeOf(() => verifyDageKey(issue({ profileId: 'otro' }), ctx))).toBe('profile');
  });

  it('rechaza una llave de otra aplicación', () => {
    const bytes = signPayload(
      { authId: 'a', profileId: 'perfil-1', app: 'otra-app', issuedAt: '2026-01-01T00:00:00Z', permissions: ['dm.combat'] },
      1,
      pair.secretKey,
    );
    expect(codeOf(() => verifyDageKey(bytes, ctx))).toBe('app');
  });

  it('rechaza una llave caducada (y la que caduca justo ahora)', () => {
    expect(codeOf(() => verifyDageKey(issue({ expiresAt: '2026-11-07T11:59:59Z' }), ctx))).toBe('expired');
    expect(codeOf(() => verifyDageKey(issue({ expiresAt: '2026-11-07T12:00:00Z' }), ctx))).toBe('expired');
  });

  it('rechaza un contenido firmado pero malformado', () => {
    expect(codeOf(() => verifyDageKey(signPayload({ hola: 1 }, 1, pair.secretKey), ctx))).toBe('payload');
    expect(codeOf(() => verifyDageKey(signPayload('texto', 1, pair.secretKey), ctx))).toBe('payload');
  });

  it('exige al menos un permiso conocido e ignora los desconocidos', () => {
    const base = { authId: 'a', profileId: 'perfil-1', app: 'dragon-age-dm-station', issuedAt: '2026-01-01T00:00:00Z' };
    expect(codeOf(() => verifyDageKey(signPayload({ ...base, permissions: [] }, 1, pair.secretKey), ctx))).toBe('noPermissions');
    expect(codeOf(() => verifyDageKey(signPayload({ ...base, permissions: ['dm.futuro'] }, 1, pair.secretKey), ctx))).toBe('noPermissions');
    expect(verifyDageKey(signPayload({ ...base, permissions: ['dm.futuro', 'dm.tools'] }, 1, pair.secretKey), ctx).permissions).toEqual(['dm.tools']);
  });

  it('un keyId como "__proto__" no se resuelve por la cadena de prototipos', () => {
    // trusted es un objeto normal: comprobamos que solo cuentan las claves propias.
    expect(codeOf(() => verifyDageKey(issue({}, 0), { ...ctx, trusted: {} }))).toBe('unknownKey');
  });
});
