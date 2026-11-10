# Seguridad y alcance de la llave del DJ

> Estado: implementado en la Fase 2 (formato `.dagekey` v1, verificación, `tools/keygen`). Revisión final en la Fase 7.

## Qué hace la llave

Separa la **experiencia** (Modo Jugador / Modo DJ). Una credencial firmada con Ed25519 y ligada al ID de un perfil habilita las rutas del DJ. Un perfil con llave puede usar ambos modos.

## Limitaciones (deben mantenerse visibles para el usuario)

- En una app local **todo el código es modificable** por quien la ejecuta. La llave no protege un secreto.
- **El contenido del DJ se distribuye al cliente**, en un chunk de carga diferida (`content/dm`, cargado con `loadDmContent()` solo desde el compendio protegido por `dm.compendium`). No se cifra en esta versión: cualquiera que abra las herramientas del navegador puede leer ese chunk. El índice de búsqueda y las pantallas del jugador no lo cargan.
- Quien copie un perfil copia su llave: la credencial viaja dentro del `.dageprofile` (firmada y ligada al ID, de modo que «Importar como perfil independiente» la descarta).
- La caducidad depende del **reloj del dispositivo**. Quien lo atrase puede usar una llave caducada.
- **No hay revocación remota.** Una llave emitida vale hasta que caduque. Para invalidar una clave de firma hay que publicar una versión de la app que retire su `keyId`.
- El checksum del `.dageprofile` detecta daños y ediciones accidentales, **no autentica** el archivo: cualquiera puede recalcularlo.
- La clave pública está en el código de la app. Quien tenga la clave **privada** puede emitir llaves para cualquier perfil.
- Los manuales no se incluyen en el repositorio ni en el build. El contenido derivado de los libros no se publica abiertamente: la app se sirve por HTTPS desde un hosting estático privado o sin indexar.

Estas limitaciones se resumen en la pantalla de Perfil, en «Llave del DJ».

## Formato `.dagekey` v1 (binario)

```
"DAGEKEY1" (8) | u8 formatVersion | u8 keyId | u32 payloadLen (big-endian) | payload JSON UTF-8 | firma Ed25519 (64)
```
La firma cubre cabecera y payload. Payload: `{ authId, profileId, app: "dragon-age-dm-station", issuedAt, expiresAt?, permissions[] }`.

La app rechaza, con motivo distinto cada vez: no es una llave (`format`), incompleta o con datos sobrantes (`truncated`/`format`), `formatVersion` desconocida (`version`), `keyId` sin clave pública (`unknownKey`), firma incorrecta (`signature`), contenido mal formado (`payload`), otra aplicación (`app`), otro perfil (`profile`), caducada (`expired`) o sin permisos conocidos (`noPermissions`). Los permisos desconocidos de una llave futura se ignoran.

Se guarda la credencial firmada (bytes), nunca un booleano, y se **revalida** al arrancar, al cambiar de perfil, al volver a primer plano y cuando llega su caducidad.

Permisos: `dm.compendium`, `dm.campaigns`, `dm.combat`, `dm.encounters`, `dm.tools`. La llave estándar los concede todos. Cada ruta del DJ declara el suyo.

## Custodia de la clave privada

- La clave privada de firma **vive fuera del repositorio**: `secrets/key-<id>.dagekey.private` (ignorada por `.gitignore` junto con `*.pem` y `*.dagekey.private`).
- Guárdala en un gestor de contraseñas o un volumen cifrado, con **copia de seguridad separada**. Si se pierde, no se pueden emitir más llaves con ese `keyId`; las ya emitidas siguen valiendo.
- Si se filtra: genera otro par (`npm run keygen -- init --key 2`), añade su pública a `core/keys/trustedKeys.ts`, publica la app y retira la pública antigua; reemite las llaves.
- La app incluye solo un mapa `keyId → clave pública`, lo que permite rotar sin cambiar el formato.
- La clave de pruebas E2E (`keyId 255`, privada en `e2e/test-key.ts`) solo se confía en el build `--mode e2e`; el build de producción no la contiene (comprobado en la Fase 2).
- `src/core/keys/testKeys.ts` contiene una clave fija **solo para tests unitarios**; nunca está en `TRUSTED_KEYS`.

Guía de uso de `tools/keygen`: `tools/keygen/README.md`.

## Datos del dispositivo

- Todo se guarda en IndexedDB del navegador, sin cifrar. Quien tenga acceso al dispositivo desbloqueado tiene acceso a los datos.
- Se pide almacenamiento persistente (`navigator.storage.persist()`); iOS puede borrar datos de sitios sin uso si la app no está instalada. Hay recordatorio de copias de seguridad configurable.
- Importar valida estructura (Zod), aplicación, versiones y checksum, y comprueba que **todas las filas pertenezcan al perfil del archivo y a tablas registradas**: un archivo manipulado no puede escribir en otro perfil ni en tablas internas (`profiles`, `snapshots`, `meta`).

## Pendiente

Revisión final en la Fase 7.
