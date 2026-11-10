# ADR 0002 — Perfiles, llave del DJ y capa de datos

**Fecha:** 2026-11-07 · **Estado:** aceptada · **Fase:** 2

## Decisiones

### Registro de stores (`src/data/stores.ts`)
Cada tabla Dexie se declara como `StoreSpec { table, module, ownerField, schema, since, exportable, profileBound?, root? }`. Exportar, importar, crear snapshots y borrar en cascada **recorren ese registro**; no hay listas de tablas en otro sitio. Las features declaran sus tablas en `ownedStores` del manifiesto y `app/registry.ts` las convierte con `dataConfigFor(manifests)`.

Reglas impuestas por `validateStoreSpecs` (y por tanto por tests):
- La clave primaria de una tabla de perfil es `ownerProfileId` o `[ownerProfileId+…]`, y si es compuesta se indexa también `ownerProfileId`. Así la importación como perfil independiente solo reescribe ese campo y dos perfiles pueden tener filas con el mismo `id` sin colisionar.
- `stores.test.ts` compara las tablas reales de IndexedDB (`backendDB().objectStoreNames`) con el registro: una tabla creada sin registrar rompe el test.

Tablas del núcleo: `profiles` (raíz), `credentials` (`profileBound`: se descarta al importar como independiente), `settings`, `snapshots` (no viaja en `.dageprofile`, pero se borra en cascada) y `meta` (global del dispositivo: `deviceId`).

### Versionado de esquema y migraciones
- La versión Dexie `N` declara todas las tablas con `since <= N` (acumulativo). La versión actual es el máximo entre `since` y `migration.version`.
- `ModuleMigration.upgrade(tx: StoreTx)` trabaja sobre un subconjunto mínimo de la transacción. **La misma función** se ejecuta sobre Dexie al actualizar IndexedDB y sobre las filas de un archivo antiguo al importarlo (transacción en memoria), de modo que cada migración se escribe una sola vez.
- `destructive: true` ⇒ antes de la actualización se guarda un snapshot de cada perfil dentro de la misma transacción. Esos snapshots (`reason: 'migration'`) se recuperan **como archivo** («Guardar como archivo»): restaurarlos aplicaría otra vez la migración.
- Dexie 4 abre sin error una base de datos de versión **más nueva** que la declarada; `openDb` lo detecta y se niega a escribir (mensaje «versión más nueva de la app»).
- *Golden fixtures*: `src/data/__fixtures__/v<N>.dageprofile`, generado una vez con esa versión y nunca regenerado; `fixtures.test.ts` comprueba que sigue importándose.
- Hoy solo existe la versión 1: no hay aún ninguna migración real. Las rutas de migración y de snapshot previo a migración se prueban con módulos de prueba (`data/testing.ts`).

### Perfiles y sesión
- ID de 128 bits con `crypto.getRandomValues` (`newId`). `createdAt` es estrictamente creciente para que «el primer perfil» esté definido.
- `revision` (entero) y `modifiedAt` suben en cada escritura de datos del perfil (`touchProfile`). `lastBackupAt` **no** sube la revisión: exportar no debe hacer «más nuevo» al perfil.
- Estado en un store Zustand (`core/session.ts`). Último perfil activo en `localStorage`; recuperación automática al arrancar (último → primero → bienvenida).
- Las pantallas de perfil/ajustes/importación viven en `app/` (no son features: pertenecen al núcleo y no tienen permiso ni manifiesto).

### Llave `.dagekey`
- Formato y comprobaciones tal como en `PLAN_v2.md` §2.5, implementado en `core/keys/dagekey.ts`. Solo importa paquetes npm para que `tools/keygen` lo ejecute con Node (type stripping, `allowImportingTsExtensions`, `erasableSyntaxOnly`).
- **SHA-512 síncrono de `@noble/hashes`**, no `crypto.subtle`: `subtle` no existe en HTTP sin contexto seguro (pruebas por LAN) y Ed25519 en `subtle` no está en todos los navegadores. Se añade `@noble/hashes` (mismo autor que `@noble/ed25519`) también para SHA-256 del checksum.
- Se guardan los bytes de la credencial firmada; se revalida al arrancar, al cambiar de perfil, al volver a primer plano y al llegar su caducidad.
- Las rutas `/dm/*` siempre existen pero están protegidas: `DmGate` (llave válida) y `RequirePermission` por ruta. Los permisos se leen al renderizar, por lo que quitar la llave o cambiar de perfil los revoca sin recargar. El layout del DJ no se monta sin llave.
- Clave pública de producción en `core/keys/trustedKeys.ts` (keyId 1). La clave de pruebas E2E (keyId 255) solo entra con `vite build --mode e2e` (`import.meta.env.MODE`); se verificó que el build de producción no la contiene.

### Importación (`data/exchange`)
Pipeline: JSON → Zod → `app`/versiones → **checksum SHA-256** de JSON canónico → migración → validación de que cada fila pertenece a una tabla registrada exportable **y al perfil del archivo** (impide colar filas de otro perfil) → resumen → comparación → aplicación en una transacción (con snapshot previo al sustituir).
Comparación con el perfil existente: `identical`, `newer`, `older`, `divergent` (señales contradictorias de `revision` y `modifiedAt`). Sin fusión automática: cancelar, independiente o sustituir.
El checksum detecta daños y ediciones accidentales; **no autentica** el archivo (cualquiera puede recalcularlo).

### Exportación de archivos
`core/files.saveFile`: File System Access → Web Share (como texto plano, porque iOS puede rechazar tipos desconocidos) → descarga. Importación con `<input type="file">` sin `accept`.

## No implementado (a propósito)
- Cifrado del contenido del DJ (ver `docs/SECURITY.md`).
- Migraciones de módulos reales (no hay módulos con datos aún).
- `assets` del `.dageprofile` (retratos): el campo existe y va vacío hasta la Fase 4.

## Consecuencias
- Cada feature con datos debe cumplir la regla de clave primaria y declarar `ownedStores`; si cambia su modelo, añade `ModuleMigration` y un golden fixture.
- Las dependencias nuevas: `@noble/hashes`.
