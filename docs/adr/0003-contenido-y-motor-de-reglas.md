# ADR 0003 — Contenido del compendio y motor de reglas

**Fecha:** 2026-11-10 · **Estado:** aceptada · **Fase:** 3

## Contexto

La Fase 3 incorpora todas las reglas y datos de la Caja Básica (niveles 1 a 5): un motor de tiradas puro, el contenido transcrito, el texto narrativo, el reglamento con búsqueda y un lanzador de dados. Las fuentes, por autoridad: PDF (Manual del Jugador y Manual del Narrador) > `docs/RULES_ERRATA.md` > compendio.

## Decisiones

### `rules/` — motor puro
- Sin React, sin Dexie y sin imports del proyecto (lo impone ESLint). `rules/types.ts` define los tipos de dominio (atributos, grupos de armas, razas, clases, escuelas, armaduras, `DiceExpr`, `WeaponStats`); el contenido los satisface de forma estructural.
- El RNG es inyectable (`Rng = () => number`): `cryptoRng()` en la app (`crypto.getRandomValues`), `seededRng` y `sequenceRng` (caras fijas) en tests. Así el motor es determinista y comprobable con los ejemplos de los manuales.
- Módulos: `dice` (1d3 = 1d6/2 hacia arriba, `parseDice`), `checks` (3d6 con dado dragón, dobles en dos dados cualesquiera, PP = dado dragón solo con éxito y dobles, enfrentadas con desempate dragón → atributo, avanzadas), `attributes` (tabla 3d6 → valor, generación en orden de hoja, intercambio), `derived` (Defensa, Velocidad, armadura entrenada/no entrenada, Salud, Maná, niveles, Potencia mágica, muerte, curación, recuperación), `attack` (atributo de ataque por grupo, Percepción en arcos, sin entrenamiento −2/mitad, Fuerza mínima 1d6−1, alcance corto/largo, armadura, penetrante, Atravesar armadura), `magic` (coste con armadura, talento de escuela, Lanzamiento hábil, tirada de hechizo), `stunts` (costes efectivos, una vez por asalto salvo Hostigar, gasto de PP).
- **Fichas literales**: `rollLiteralAttack/Damage` usan los valores publicados de criaturas y PNJ; nunca recalculan.

### Interpretaciones del motor (registradas en `RULES_GAPS.md`)
Cuando el manual no fija un orden de aplicación, el motor elige uno explícito y documentado, no «oficial»:
1. Sin entrenamiento, el daño se reduce a la mitad tras sumar el atributo (errata); las bonificaciones adicionales (Golpe poderoso, Puñalada…) se suman **después** de esa reducción y antes de la armadura.
2. Coste de hechizo: reducción por talento de escuela (mínimo 1) → suma del impedimento mágico de la armadura → Lanzamiento hábil (mínimo 0).
3. Reducciones de PP: el menor «por N PP» aplicable y después los descuentos; nunca por debajo de 0.
4. Quirurgía (Experto): `2 × (dado dragón + Astucia)`, la única lectura coherente con el texto claro del Manual del Narrador (hermana Arda); el Manual del Jugador lo redacta de forma ambigua.

### `content/` — datos transcritos, validados con Zod
- **Sin parser de PDF ni de Markdown para datos de juego**: transcritos a mano a TypeScript y validados con Zod al cargar el módulo (`parseCatalog` también rechaza ids duplicados). Cada registro lleva `source: { book, section, page? }` (`page` solo cuando se comprobó la página impresa) y `audience: "player" | "dm"`.
- Identificadores estables en kebab-case (`virote-arcano`, `espada-corta`, `golpe-poderoso`, `combate-un-arma`) compartidos entre compendio, fichas y combate. Los términos del compendio quedan en `aliases` y alimentan la búsqueda.
- Catálogos de jugador (`content/player/`): concentraciones (67), armas (24), armaduras (6), escudos (3), equipo, proezas (10 de combate + 6 mágicas), talentos (22), clases (3, niveles 1–5), trasfondos (7, con tablas 2d6 por raza), hechizos (18), estados (5), tablas y animales/monturas (5). Catálogos del DJ (`content/dm/`): criaturas (22), PNJ (9), objetos mágicos (16) y tablas del DJ.
- **Estados**: ni el manual ni el compendio dan lista oficial. El catálogo cerrado contiene los cinco que las fuentes describen con efecto: derribado, inmovilizado, paralizado, inconsciente y moribundo. Cualquier otro efecto es «efecto libre del DJ» (`FREE_EFFECT_ID`) y no se interpreta mecánicamente.
- **Concentraciones de criatura**: catálogo abierto (Mordisco, Garras, Cornada, Tacto, Gusto en `dm/`); las criaturas pueden llevar además las de PJ. Los atributos de criatura pueden superar 4.
- **PNJ sin bloque de combate** (Hermana Arda, Orellis, los Mullin, el posadero genérico) llevan `combat: null`: no se inventan valores.

### Separación jugador / DJ
- `content/index.ts` solo exporta contenido de jugador; el del DJ se obtiene con `loadDmContent()` (`import('./dm')`, chunk diferido). Ningún módulo de `content/player/` importa del DJ y el índice de búsqueda del jugador se construye solo con contenido de jugador; tests lo comprueban (importaciones, audiencia de cada documento y búsquedas de términos del DJ).
- Como se documenta en `SECURITY.md`, el contenido del DJ **no se cifra**: la separación es de experiencia, no de secreto.

### Texto narrativo: script de build con clasificación explícita
- `tools/content/build-narrative.ts` (`npm run content:narrative`) divide el compendio por encabezados `##` y genera `src/content/generated/narrative.{player,dm}.ts`. Los manuales y el compendio no se incluyen en el repositorio; los archivos generados sí.
- La clasificación vive en `src/content/narrativeClassification.ts` y es **explícita por sección**: el script falla si aparece una sección sin clasificar o si una clasificación ya no existe.
- Capítulos 1–6 jugador; 8–11 DJ; en el 7, 7.1–7.8, 7.10 y 7.11 jugador. Resto de la 7, contrastado con el manual de origen: **7.9 (modificadores al ataque), 7.12 (moral) y 7.14 (peligros) → DJ** (Manual del Narrador, capítulo 2); **7.13 se divide**: el combate montado (Manual del Jugador) es de jugador y las criaturas voladoras (Manual del Narrador), del DJ. Capítulos 12 y 13 (no fijados por el plan): 12.1–12.3 jugador, 12.4 DJ; el glosario es de jugador salvo la entrada «Vhenallin», que solo aparece en la aventura.
- **Secciones excluidas** (3.4, 3.5, 4.2, 5.2–5.6, 6.5, 9.5, 10.2, 11.12): están cubiertas por los datos estructurados verificados contra el PDF. Mostrar también el texto del compendio duplicaría resultados y arrastraría sus erratas (nombres antiguos, penalizaciones, objetos).
- Las secciones con erratas conocidas llevan al final una nota «Corrección verificada en el manual» (`corrections`).

### Búsqueda y pantallas
- `core/search.ts`: MiniSearch por nombre, alias, categoría y contenido, insensible a mayúsculas y diacríticos, con prefijos y tolerancia leve a erratas; si ninguna ficha reúne todos los términos, amplía a los significativos. `core/searchDocs.ts` construye los documentos (`buildPlayerDocs`, y `buildDmDocs` solo con el chunk del DJ cargado).
- `features/rulebook` (Modo Jugador, `/reglas`): buscador y explorador por categorías, fichas por tipo de registro. `features/compendium` (Modo DJ, `/dm/compendio`, permiso `dm.compendium`): contenido del DJ más el reglamento, carga diferida. `features/dice` (`/dados`): tiradas de atributo, enfrentadas, avanzadas y dados sueltos con el motor.
- `ui/Markdown` es un renderizador mínimo sin HTML crudo (todo son nodos de React); `ui/Table` convierte tablas anchas en tarjetas en móvil.
- Se retira el módulo de ejemplo de la Fase 1 (ya hay features reales); el test «un módulo añadido solo con su manifiesto» se mantiene con módulos ficticios.

## Consecuencias
- Añadir contenido = nueva fila en el catálogo + test de recuento; sin tocar el motor.
- Un nuevo hechizo, arma o criatura aparece automáticamente en búsqueda y fichas.
- `toCombatant(entity): CombatantView` y el estado de combate (Fase 5) se apoyan en `rules/attack` y en los valores literales de `content/dm`; no existen aún.
- No hay tablas Dexie nuevas en esta fase: no cambia el modelo de datos ni hace falta migración.
