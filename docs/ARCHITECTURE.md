# Arquitectura

PWA local-first en español para Dragon Age (Caja Básica, niveles 1 a 5). Sin cuentas ni backend. Plan completo: `PLAN_v2.md`.

## Stack

React + TypeScript estricto + Vite · vite-plugin-pwa · Dexie · Zod · Zustand · React Router · MiniSearch · @noble/ed25519 · Vitest + Testing Library + fake-indexeddb · Playwright · ESLint · CSS Modules con tokens en `src/ui/tokens.css`.

## Capas (`src/`)

| Capa | Contenido | Puede importar |
|---|---|---|
| `app/` | arranque, router, layouts, **registro de módulos** | todo salvo Dexie |
| `core/` | perfiles, permisos, llaves, errores, búsqueda, tipo `FeatureManifest` | `data`, `content`, `rules`, `ui` |
| `data/` | Dexie, repositorios, migraciones, import/export | `core`, `content`, `rules` |
| `content/` | datos estáticos validados y esquemas | `rules` (tipos) |
| `rules/` | motor puro | nada del proyecto (solo tipos de dominio) |
| `features/*` | funcionalidad por dominio | `core`, `ui`, repositorios; otras features solo por su `index.ts` |
| `ui/` | componentes y tokens | nada de `features`, `app`, `data` |

Los límites los impone ESLint (`eslint.config.js`) y los verifica `src/lint-boundaries.test.ts`.
Dexie solo se importa desde `src/data`.

## Módulos

Cada feature exporta un `FeatureManifest` desde su `index.ts`:

```ts
{ id, routes, nav, requiredPermission, ownedStores, migrations }
```

Añadir una feature = crear `src/features/<id>/index.ts` con su manifiesto y añadirlo a `src/app/registry.ts`.
`requiredPermission: null` → Modo Jugador (`/`). Con permiso → Modo DJ (`/dm/...`): `/dm` exige una llave válida y cada ruta comprueba su permiso al renderizar (`app/DmPages.tsx`). `core/permissions` lee la credencial validada de `core/session`.

Las pantallas del núcleo (bienvenida, perfil, ajustes, importación) están en `app/`; no son features.

Features actuales: `rulebook` (jugador), `dice` (jugador), `compendium` (DJ, `dm.compendium`).

## Datos (Fase 2)

- `data/db.ts`: apertura de Dexie, versiones acumulativas, migraciones y snapshot previo a las destructivas.
- `data/stores.ts`: **registro de stores**. Cada tabla declara módulo y campo propietario; exportar, importar, snapshots y borrado en cascada lo recorren. Un test falla si hay una tabla sin registrar o con clave primaria que no incluya `ownerProfileId`.
- Repositorios: `profiles.ts`, `settings.ts`, `credentials.ts`. Todo cambio de datos de un perfil llama a `touchProfile` (revisión + fecha).
- `data/exchange/`: `format.ts` (Zod, JSON canónico, checksum), `build.ts` (exportar/snapshots sobre el registro), `parse.ts` (validar y migrar), `importer.ts` (analizar, aplicar, snapshots).
- `core/session.ts` (Zustand): perfil activo, ajustes y estado de la llave. `core/keys/`: formato `.dagekey`, claves de confianza.

### Añadir una feature con datos
1. Declara en su manifiesto `ownedStores: [{ table, ownerField: 'ownerProfileId', schema: '[ownerProfileId+id], ownerProfileId, …', since: <versión> }]`.
2. Si cambia un modelo existente: `migrations: [{ version, description, upgrade, destructive? }]` y un golden fixture nuevo.
3. Todas las escrituras pasan por un repositorio que llame a `touchProfile`.
Exportar, importar y borrar quedan cubiertos sin tocar el núcleo (`ADR 0002`).

### Formato `.dageprofile` (v1)
JSON UTF-8 `{ format, formatVersion, schemaVersion, exportedAt, app, deviceId, profile{id,name,createdAt}, revision, modifiedAt, stores{tabla:[filas]}, assets, checksumSha256 }`. El checksum es SHA-256 del JSON canónico (claves ordenadas) sin el propio campo.

## Contenido y motor de reglas (Fase 3)

- `rules/` — motor puro (sin React, sin Dexie, sin imports del proyecto): `dice`, `checks` (3d6 con dado dragón, dobles, PP, enfrentadas, avanzadas), `attributes`, `derived` (Defensa, Velocidad, Salud, Maná, niveles, Potencia mágica, muerte y recuperación), `attack` (ataque, daño, alcance, armadura), `magic`, `stunts`. RNG inyectable (`cryptoRng`, `seededRng`, `sequenceRng`). Las criaturas y PNJ usan valores **literales** (`rollLiteralAttack/Damage`), nunca recalculados.
- `content/` — datos transcritos validados con Zod (`schemas.ts`, `parseCatalog`). `player/` (jugador) y `dm/` (DJ, chunk diferido con `loadDmContent()`). Cada registro: `id` estable, `aliases`, `source { book, section, page? }`, `audience`. `generated/narrative.*.ts` lo produce `npm run content:narrative` (ver más abajo).
- `core/search.ts` y `core/searchDocs.ts` — MiniSearch sobre los documentos; `buildPlayerDocs()` solo usa contenido de jugador, `buildDmDocs(dm)` solo existe con el chunk del DJ cargado.
- `features/rulebook` (`/reglas`, jugador), `features/compendium` (`/dm/compendio`, permiso `dm.compendium`) y `features/dice` (`/dados`, jugador). Ninguna posee tablas Dexie.
- `ui/Markdown` (sin HTML crudo), `ui/Table` (tarjetas en móvil), `ui/KeyValue`.

### Texto narrativo
`tools/content/build-narrative.ts` lee el compendio (fuera del repositorio), lo divide por encabezados `##` y escribe `src/content/generated/narrative.player.ts` y `narrative.dm.ts`. La clasificación por sección es explícita (`src/content/narrativeClassification.ts`) y el script falla ante una sección sin clasificar. Las secciones cubiertas por datos estructurados se excluyen. Se vuelve a ejecutar solo si cambia el compendio o la clasificación; los archivos generados se versionan. Detalle y criterios en `docs/adr/0003-contenido-y-motor-de-reglas.md`; contraste con los PDF en `docs/CONTENT_VERIFICATION.md`.

### Añadir contenido
1. Nuevo hechizo, arma, talento, criatura…: una entrada en su catálogo (`content/player/*` o `content/dm/*`) con `source` y `audience`; los tests de recuento y referencias cruzadas se actualizan con él.
2. Aparece solo en búsqueda y fichas: no hay listas duplicadas.
3. Si el modelo de datos de un perfil cambia, sigue valiendo la regla de la Fase 2 (migración + golden fixture).

## PWA

`vite-plugin-pwa` con `autoUpdate`; precachea el build para funcionar sin conexión. Iconos generados con `npm run icons`.

## Comprobaciones

`npm run check` = tipos + lint + tests + build. Flujo móvil: `npm run e2e` (Playwright, Chromium y WebKit móviles; requiere `npx playwright install chromium webkit`). El E2E construye con `--mode e2e` en `dist-e2e/` para confiar en una clave de pruebas que el build normal no incluye.

## ADR

Decisiones en `docs/adr/`.
