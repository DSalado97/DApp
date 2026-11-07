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

## Comandos
`npm run dev` · `npm run check` (tipos+lint+test+build) · `npm run e2e` · `npm run icons`

## Estado
- Fase 1 (cimientos): hecha. Siguiente: Fase 2 (perfiles, datos y llave), solo con confirmación del usuario.
