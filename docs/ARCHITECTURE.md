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
`requiredPermission: null` → Modo Jugador (`/`). Con permiso → Modo DJ (`/dm/...`); solo se monta si `core/permissions.hasPermission` lo concede (en la Fase 1 nunca, hasta que exista la llave).

## Registro de stores (Fase 2)

Cada tabla declara módulo y `ownerProfileId`; exportación, importación y borrado en cascada recorren ese registro. Un test falla si hay una tabla sin registrar. `ownedStores` del manifiesto alimenta ese registro.

## PWA

`vite-plugin-pwa` con `autoUpdate`; precachea el build para funcionar sin conexión. Iconos generados con `npm run icons`.

## Comprobaciones

`npm run check` = tipos + lint + tests + build. Flujo móvil: `npm run e2e` (Playwright, Chromium y WebKit móviles; requiere `npx playwright install`).

## ADR

Decisiones en `docs/adr/`.
