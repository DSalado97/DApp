// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KeyError, verifyDageKey } from '../../src/core/keys/dagekey.ts';
import { run } from './cli.ts';

let dir = '';
const out: string[] = [];
const err: string[] = [];
const io = { log: (m: string) => out.push(m), error: (m: string) => err.push(m) };
const cli = (...args: string[]) => run(args, io);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'keygen-'));
  out.length = 0;
  err.length = 0;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const publicKeyFrom = () => (JSON.parse(readFileSync(join(dir, 'key-1.dagekey.private'), 'utf8')) as { publicKeyHex: string }).publicKeyHex;

describe('tools/keygen', () => {
  it('init genera el par, imprime la clave pública y no sobrescribe sin --force', () => {
    expect(cli('init', '--key', '1', '--secrets', dir)).toBe(0);
    expect(out.join('\n')).toContain(publicKeyFrom());
    expect(cli('init', '--key', '1', '--secrets', dir)).toBe(1);
    expect(err.join('\n')).toMatch(/Ya existe/);
    expect(cli('init', '--key', '1', '--secrets', dir, '--force')).toBe(0);
  });

  it('issue emite una llave que la app valida con la clave pública, y que sigue ligada al perfil', () => {
    cli('init', '--key', '1', '--secrets', dir);
    const file = join(dir, 'ana.dagekey');
    expect(cli('issue', '--profile', 'perfil-ana', '--secrets', dir, '--out', file, '--expires', '2999-12-31')).toBe(0);

    const bytes = new Uint8Array(readFileSync(file));
    const trusted = { 1: publicKeyFrom() };
    const claims = verifyDageKey(bytes, { trusted, profileId: 'perfil-ana' });
    expect(claims.permissions).toHaveLength(5);
    expect(claims.expiresAt).toBe('2999-12-31T23:59:59.999Z');
    expect(() => verifyDageKey(bytes, { trusted, profileId: 'otro' })).toThrow(KeyError);
  });

  it('issue acepta una lista de permisos y rechaza permisos o fechas inválidos', () => {
    cli('init', '--key', '1', '--secrets', dir);
    const file = join(dir, 'k.dagekey');
    expect(cli('issue', '--profile', 'p', '--secrets', dir, '--out', file, '--permissions', 'dm.combat,dm.tools')).toBe(0);
    const claims = verifyDageKey(new Uint8Array(readFileSync(file)), { trusted: { 1: publicKeyFrom() }, profileId: 'p' });
    expect(claims.permissions).toEqual(['dm.combat', 'dm.tools']);

    expect(cli('issue', '--profile', 'p', '--secrets', dir, '--permissions', 'dm.inventado')).toBe(1);
    expect(cli('issue', '--profile', 'p', '--secrets', dir, '--expires', 'mañana')).toBe(1);
    expect(cli('issue', '--secrets', dir)).toBe(1); // falta --profile
    expect(cli('issue', '--profile', 'p', '--key', '9', '--secrets', dir)).toBe(1); // sin clave privada
  });

  it('verify confirma una llave buena y detecta una manipulada', () => {
    cli('init', '--key', '1', '--secrets', dir);
    const file = join(dir, 'k.dagekey');
    cli('issue', '--profile', 'p', '--secrets', dir, '--out', file);
    expect(cli('verify', '--file', file, '--profile', 'p', '--secrets', dir)).toBe(0);
    const bytes = readFileSync(file);
    bytes[20] = bytes[20]! ^ 1;
    writeFileSync(file, bytes);
    err.length = 0;
    expect(cli('verify', '--file', file, '--profile', 'p', '--secrets', dir)).toBe(1);
    expect(err.join('\n')).toMatch(/signature/);
  });

  it('muestra ayuda con comandos desconocidos', () => {
    expect(cli('nada')).toBe(1);
    expect(out.join('\n')).toContain('Uso:');
  });
});
