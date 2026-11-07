# ADR 0001 — Stack, estilos y límites de capas

**Fecha:** 2026-11-07 · **Estado:** aceptada

## Decisión

- Stack fijado en `PLAN_v2.md` §2.1.
- Estilos: **CSS Modules** con tokens como variables CSS en `src/ui/tokens.css` (sin dependencia adicional, funciona offline sin paso de build extra).
- Límites de capas con `no-restricted-imports` de ESLint (sin plugin adicional), cubriendo alias `@/` y rutas relativas, y probados con un test que ejecuta ESLint sobre código de ejemplo.
- Router: `createBrowserRouter` con `basename` de Vite y *fallback* de navegación en el service worker.
- Versiones: las estables vigentes a la fecha, fijadas por `package-lock.json`.

## Consecuencias

Los patrones de lint son por texto de la ruta; una importación relativa muy rebuscada que no contenga el nombre de la capa podría evadirlos. Se acepta y se revisa en la Fase 7.
