# Dragon Age DM Station

PWA web local-first, en español, para gestionar personajes y dirigir partidas de Dragon Age (Caja Básica, niveles 1 a 5). Sin cuentas ni backend. Plan completo y fases: `PLAN_v2.md`. Arquitectura: `docs/ARCHITECTURE.md`.

## Fuentes de reglas (por orden de autoridad)
1. PDF: `../Manuales/Set 1/Manual del Jugador set-1.pdf` y `Manual del Narrador set-1.pdf` (`pdftotext -layout`, salida con `iconv -f latin1 -t utf-8`; las tablas salen desordenadas: verifica cifras).
2. `docs/RULES_ERRATA.md`.
3. Compendio `../Manuales/Set 1/Dragon_Age_Compendio_Caja_Basica.md` (fuente del texto mostrado).

Prioridades: funcionamiento real, protección de datos, compatibilidad entre dispositivos, uso móvil en partida, fidelidad a las reglas, modularidad, estética.

## Reglas permanentes
- Haz una sola fase por sesión. No empieces la siguiente sin confirmación del usuario.
- Ninguna funcionalidad queda con botones sin efecto. Lo que no esté implementado no aparece en la interfaz.
- No inventes reglas. Si una regla no consta en las fuentes, regístrala en `docs/RULES_GAPS.md` y no la implementes como oficial.
- Lee solo las secciones de las fuentes que necesite la tarea actual.
- Antes de cerrar una fase ejecuta tests, comprobación de tipos, lint y compilación (`npm run check`), y prueba el flujo principal en un navegador con viewport móvil.
- Registra decisiones importantes en `docs/adr/`.
- No dupliques motores, modelos ni almacenamiento: inspecciona lo existente antes de añadir nada.
- Cada ampliación incluye tests, migración si cambia el modelo y documentación.

## Convenciones
- Mobile First (375 px), objetivos táctiles ≥ 44 px, tablas anchas → tarjetas.
- Límites de capas impuestos por ESLint: `rules` puro; `ui` sin `features`; Dexie solo en `data`; entre features solo por `index.ts`.
- Cada feature se registra con un `FeatureManifest` en `src/app/registry.ts`.
- Importar archivos con `<input type="file">` sin filtrar extensión. No usar `crypto.randomUUID` (usar `crypto.getRandomValues`).
- Modelo de combatiente: ficha derivada (PJ) vs literal (criaturas/PNJ del manual, nunca recalculada).
- Datos: toda tabla Dexie se declara en `ownedStores` del manifiesto (clave primaria `ownerProfileId` o `[ownerProfileId+…]` con índice `ownerProfileId`); exportar, importar y borrar en cascada recorren el registro (`src/data/stores.ts`). Las escrituras pasan por un repositorio que llama a `touchProfile`. Cambio de modelo ⇒ `ModuleMigration` + golden fixture nuevo en `src/data/__fixtures__/`. Ver `docs/adr/0002-*.md`.
- Rutas del DJ: declaran `requiredPermission`; los permisos se leen al renderizar (`core/permissions`). La clave privada vive en `secrets/` (gitignored); nunca la leas ni la imprimas.
- Tests con IndexedDB: `fake-indexeddb` ya está en `test-setup.ts`; usa `openTestDb` de `src/data/testing.ts` y una base por test.
- Contenido: cada registro con `id` estable, `source` y `audience`. El del DJ vive en `src/content/dm` y se carga solo con `loadDmContent()`; `content/player` no importa de `dm`. Los nombres son los del manual (los del compendio, como `aliases`). Valores de criaturas y PNJ: literales, nunca recalculados.
- `rules/` no importa nada del proyecto; el RNG se inyecta (`Rng`). Las interpretaciones no oficiales van a `docs/RULES_GAPS.md`.

## Comandos
`npm run dev` · `npm run check` (tipos+lint+test+build) · `npm run content:narrative` (regenera la narrativa desde el compendio; solo si cambia él o su clasificación) · `npm run e2e` (requiere `npx playwright install chromium webkit`; build `--mode e2e` en `dist-e2e/`) · `npm run icons` · `npm run keygen -- <init|issue|verify>` (ver `tools/keygen/README.md`)

## Estado
- Fase 1 (cimientos): hecha.
- Fase 2 (perfiles, datos y llave): hecha. Perfiles, registro de stores, `.dageprofile` con snapshots, ajustes, `.dagekey`, `tools/keygen`, permisos y layout DJ protegido.
- Fase 3 (contenido y motor de reglas): hecha. `rules/` (motor puro con RNG inyectable), `content/` (catálogos Zod de jugador y DJ + narrativa generada), búsqueda MiniSearch, `rulebook`, `dice` y `compendium`. Ver `docs/adr/0003-*.md` y `docs/CONTENT_VERIFICATION.md`.
- Siguiente: Fase 4 (Jugador), solo con confirmación del usuario.
