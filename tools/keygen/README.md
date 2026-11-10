# tools/keygen

CLI de Node (≥ 24, ejecuta TypeScript directamente) para generar el par de claves del DJ y emitir llaves `.dagekey`. Formato y límites: `docs/SECURITY.md`.

## 1. Generar el par de claves (una vez)

```bash
npm run keygen -- init --key 1
```

- Guarda la **privada** en `secrets/key-1.dagekey.private` (carpeta ignorada por git). Haz una copia en un lugar seguro: sin ella no se pueden emitir llaves.
- Imprime la **pública**. Debe estar en `TRUSTED_KEYS` de `src/core/keys/trustedKeys.ts` con el mismo `keyId` (la clave `1` de este repositorio ya está añadida).
- No sobrescribe una clave existente salvo con `--force`.
- Para rotar: `init --key 2`, añade su pública a `TRUSTED_KEYS`, publica la app y emite las llaves nuevas con `--key 2`.

## 2. Emitir una llave para un perfil

1. La persona abre la app → **Perfil** → *Copiar ID* y te envía ese ID.
2. Emite la llave:

```bash
npm run keygen -- issue --profile <ID> --out llaves/ana.dagekey
```

Opciones: `--expires 2027-12-31` (fecha o fecha-hora ISO; una fecha sola caduca al final de ese día, UTC), `--permissions dm.combat,dm.tools` (por defecto todos), `--key <keyId>` (por defecto 1), `--secrets <carpeta>`.

3. Envía el `.dagekey` a la persona: en **Perfil → Importar llave**.

La llave solo funciona para ese ID de perfil. Si el perfil se importa «como independiente» (ID nuevo), la llave se descarta y hay que emitir otra.

## 3. Comprobar una llave

```bash
npm run keygen -- verify --file llaves/ana.dagekey --profile <ID>
```
