# PLAN PARA SONNET

## 1. Objetivo y reglas de trabajo

Aplicación web PWA, local-first, en español, para gestionar personajes y dirigir partidas de Dragon Age (Caja Básica, niveles 1 a 5), sin cuentas y sin backend. Es un proyecto nuevo: no hay código que conservar.

**Fuentes, por orden de autoridad para las reglas:**
1. Los PDF: `../Manuales/Set 1/Manual del Jugador set-1.pdf` y `Manual del Narrador set-1.pdf`. Tienen texto extraíble con `pdftotext -layout`, y la salida requiere `iconv -f latin1 -t utf-8`. Las tablas salen desordenadas: verifica las cifras con cuidado.
2. `docs/RULES_ERRATA.md`, creado en la Fase 1 a partir de la sección 3.
3. El compendio: `../Manuales/Set 1/Dragon_Age_Compendio_Caja_Basica.md`. Es la fuente del texto mostrado en la aplicación.

**Prioridades, por orden:** funcionamiento real, protección de datos, compatibilidad entre dispositivos, uso móvil en partida, fidelidad a las reglas, modularidad, estética.

**Reglas permanentes** (cópialas a `CLAUDE.md` en la Fase 1):
- Haz una sola fase por sesión. No empieces la siguiente sin confirmación del usuario.
- Ninguna funcionalidad queda con botones sin efecto. Lo que no esté implementado no aparece en la interfaz.
- No inventes reglas. Si una regla no consta en las fuentes, regístrala en `docs/RULES_GAPS.md` y no la implementes como oficial.
- Lee solo las secciones de las fuentes que necesite la tarea actual.
- Antes de cerrar una fase ejecuta tests, comprobación de tipos, lint y compilación, y prueba el flujo principal en un navegador con viewport móvil.
- Registra decisiones importantes en `docs/adr/`.
- No dupliques motores, modelos ni almacenamiento: inspecciona lo existente antes de añadir nada.
- Cada ampliación incluye tests, migración si cambia el modelo y documentación.

## 2. Arquitectura decidida

No propongas alternativas salvo bloqueo real; si surge uno, documenta el motivo en un ADR.

### 2.1. Stack

React + TypeScript estricto + Vite · `vite-plugin-pwa` · Dexie (IndexedDB) · Zod · Zustand · React Router · MiniSearch · `@noble/ed25519` · Vitest + Testing Library + `fake-indexeddb` · Playwright · ESLint con reglas de límites entre capas · CSS Modules o Tailwind, a tu elección, con tokens de diseño centralizados.

Usa versiones estables y fija el lockfile. Node 24 y npm 11 ya están instalados. Inicializa git en la Fase 1.

### 2.2. Estructura y límites

```
src/
  app/        arranque, router, layouts Jugador y DJ, registro de módulos
  core/       perfiles, permisos, llaves, notificaciones, errores, búsqueda
  data/       db Dexie, repositorios, migraciones, import/export
  content/    datos estáticos validados (player/, dm/) y esquemas
  rules/      motor puro, sin React, sin Dexie
  features/   character, inventory, spellbook, dice, rulebook, creatures,
              npcs, encounters, combat, campaigns, sessions
  ui/         componentes y tokens de diseño
tools/keygen/ CLI Node para generar pares de claves y archivos .dagekey
```

Dependencias permitidas, impuestas por lint:
- `rules` no importa nada del proyecto salvo tipos de dominio.
- `ui` no conoce `features`.
- `features` usa repositorios y servicios, nunca Dexie directamente, y solo importa de otra feature a través de su `index.ts`.
- Cada feature se registra con un manifiesto único: `{ id, routes, nav, requiredPermission, ownedStores, migrations }`.
- Dentro de cada feature, crea solo las carpetas que hagan falta; no generes carpetas vacías.

**Registro de stores (crítico):** cada tabla declara su módulo y su `ownerProfileId`. La exportación, la importación y el borrado en cascada recorren ese registro, de modo que los módulos futuros queden cubiertos sin tocar el núcleo. Un test falla si existe una tabla sin registrar.

### 2.3. Modelo de combatiente

Existen dos fuentes de ficha:
- **Derivada (PJ):** Defensa, Velocidad, ataques y demás se calculan en `rules/`.
- **Literal (criaturas y PNJ del manual):** los valores se guardan tal como se publican y nunca se recalculan. El Cazador avvarita lista Armadura 3 con malla ligera en el propio manual; ese dato se respeta. Los atributos de criatura pueden superar 4 (Oso negro: 6).

Ambas se exponen mediante `toCombatant(entity): CombatantView`. Las concentraciones son un catálogo abierto: las criaturas usan Mordisco, Garras, Cornada, Tacto y Gusto, que no están en la lista de PJ. Usa identificadores estables para hechizos, talentos, armas y proezas, compartidos entre compendio, fichas y combate.

### 2.4. Combate y referencias a PJ

- `CombatParticipant = { sourceRef, instanceLabel, currentHealth, currentMana, conditions[], initiative, flags }`. La ficha no se copia: el estado del combate es una capa sobre la referencia.
- Varias instancias pueden compartir fuente ("Genlock 1", "Genlock 2").
- Si la fuente se borra, el participante conserva un snapshot mínimo y lo indica.
- Al cerrar el combate se muestra un resumen y el DJ decide qué se escribe en la ficha. Nunca se escribe en silencio.
- **PJ de otros dispositivos o perfiles:** el jugador exporta su personaje como `.dagechar` y el DJ lo importa a su biblioteca como *PJ vinculado*, con `originProfileId`, `originCharacterId` y `revision`. Reimportar actualiza ese mismo registro y avisa si es más antiguo. Es una copia inevitable y controlada; el DJ no lee perfiles ajenos, aunque estén en el mismo dispositivo.
- Sin sincronización automática ni servicios externos.

### 2.5. Perfiles y llave del DJ

**Perfil:** solo nombre. El ID interno usa `crypto.getRandomValues` (`crypto.randomUUID` falla en HTTP sin contexto seguro, como pruebas por LAN). La pantalla de perfil permite copiar el ID para solicitar la llave. El último perfil activo va en `localStorage`; todo lo demás, en IndexedDB. El borrado se confirma y ocurre en una única transacción sobre el registro de stores.

**Formato `.dagekey` v1 (binario):**
`magic "DAGEKEY1"` | `u8 formatVersion` | `u8 keyId` | `u32 payloadLen` | `payload JSON UTF-8` | `firma Ed25519 de 64 bytes` sobre todo lo anterior.

Payload: `{ authId, profileId, app: "dragon-age-dm-station", issuedAt, expiresAt?, permissions[] }`.

- La aplicación incluye un mapa `keyId → clave pública`, lo que permite rotar claves sin invalidar el formato.
- La clave privada vive fuera del repositorio; añade su ruta a `.gitignore` y documenta su custodia. `tools/keygen` genera pares y llaves.
- Rechaza formato inválido, versión o `keyId` desconocidos, firma incorrecta, otra `app`, otro `profileId` o llave caducada.
- Se guarda la credencial firmada, nunca un booleano, y se verifica al arrancar y al cambiar de perfil.
- Permisos iniciales: `dm.compendium`, `dm.campaigns`, `dm.combat`, `dm.encounters`, `dm.tools`. La llave estándar los concede todos. Cada ruta declara su permiso.
- Un perfil con llave puede usar el Modo Jugador y el Modo DJ.

**Interacción con importaciones:** la credencial viaja dentro del `.dageprofile`, porque está firmada y ligada al ID. "Importar como perfil independiente" genera un ID nuevo, descarta la credencial y lo avisa antes de confirmar.

**Limitaciones que deben documentarse en `docs/SECURITY.md`:** en una app local todo el código es modificable y el contenido del DJ se distribuye al cliente. La llave separa la experiencia, no protege un secreto. Quien copie un perfil copia su llave, la caducidad depende del reloj del dispositivo y no hay revocación remota. El contenido del DJ va en un chunk de carga diferida; no se cifra en esta versión.

### 2.6. Persistencia, archivos y plataformas

- Migraciones Dexie versionadas y *golden fixtures* por versión de esquema, cargadas en tests.
- Antes de una migración destructiva, guarda un snapshot local recuperable.
- Llama a `navigator.storage.persist()`. Muestra el estado de almacenamiento y recuerda hacer copias de seguridad; iOS puede borrar datos de sitios sin uso si la app no está instalada.
- Los cambios se guardan automáticamente con debounce y al pasar a segundo plano (`visibilitychange`), no solo en `beforeunload`, que no es fiable en móvil.
- Importa archivos con `<input type="file">` **sin filtrar por extensión**, porque iOS puede bloquear las extensiones propias, y valida el contenido después.
- Exporta con File System Access API cuando exista; si no, usa Web Share API o descarga, en ese orden. Safari y Firefox no ofrecen elegir carpeta, así que ese requisito se cumple solo donde el navegador lo permite.
- Los retratos se reducen en cliente antes de guardarse, para limitar el tamaño de los archivos exportados.
- La aplicación se sirve por HTTPS desde un hosting estático privado o sin indexar. Los manuales no se incluyen en el repositorio ni en el build. El contenido derivado de los libros no se publica abiertamente.

### 2.7. Formato `.dageprofile`

JSON UTF-8: `{ format, formatVersion, schemaVersion, exportedAt, app, deviceId, profile, revision, modifiedAt, stores: {...}, assets: {...}, checksumSha256 }`.

Se construye desde el registro de stores. La misma canalización sirve para copias de seguridad, y `.dagechar`/`.dagecampaign` son subconjuntos.

**Importación:**
1. Leer y validar con Zod.
2. Verificar checksum y versión; migrar si es antiguo y rechazar si es más nuevo que la app.
3. Mostrar resumen.
4. Si el ID existe, comparar `revision` y `modifiedAt`, avisar si es más antiguo o divergente, y ofrecer cancelar, importar como independiente o sustituir con confirmación.
5. Crear un snapshot automático del perfil afectado antes de sustituir.
6. Aplicar en una transacción y confirmar.

No hay fusión automática. Conserva los últimos 3 snapshots por perfil, restaurables desde el selector.

## 3. Correcciones al compendio (`docs/RULES_ERRATA.md`)

Verificadas contra los PDF. **Prevalecen sobre el compendio.** Busca más desviaciones al transcribir datos.

| Tema | Regla del manual |
|---|---|
| Potencia mágica | `10 + Magia + concentración`; el compendio no da la fórmula |
| Atributo de ataque | Destreza: Arcos, Bastones, Hojas ligeras, Pelea. Fuerza: Armas contundentes, Hachas, Hojas pesadas, Lanzas |
| Daño de arma | Daño base + Fuerza; Arcos suman Percepción en lugar de Fuerza |
| Sin entrenamiento en el grupo | −2 al ataque y mitad del daño, redondeando abajo, tras sumar el atributo; alcance a la mitad en proyectiles |
| Fuerza mínima no alcanzada | El arma inflige solo 1d6−1 |
| Alcance corto/largo y recarga | Arco corto 16/32 m, menor · Arco largo 26/52 m, menor · Ballesta 30/60 m, mayor · Cuchillo arrojadizo 6/12 m, menor · Hacha arrojadiza 4/8 m, menor · Lanza arrojadiza 8/16 m, menor. Largo alcance: −2 |
| Armas omitidas | Guantelete 1d3+1, 4 mp; Puño 1d3 (ambas Pelea) |
| Terminología | Usa la del manual. Compendio → manual: Martillo de guerra → Mazo · Martillo a dos manos → Mazo a dos manos · Bastón → Báculo · Espadón → Espada a dos manos · Jabalina → Lanza arrojadiza · Placas → Coraza · Escudo medio → Escudo mediano. Mantén los términos del compendio como alias de búsqueda |
| Penalización de armadura | Con entrenamiento, a Velocidad; sin él, a Destreza y, por tanto, también a Velocidad |
| Proezas | Cada una, una vez por asalto; excepción en combate: Hostigar. Las proezas mágicas también son una vez por asalto |
| Salud y muerte | La Salud nunca baja de 0. El PJ moribundo muere al comienzo de su turno en el último asalto. La mayoría de los PNJ mueren a 0 |
| Contener golpe | Quien asesta un golpe mortal puede dejar al objetivo inconsciente con 1 Salud; despierta en 2d6 minutos |
| Golpe de gracia | Acción mayor de un enemigo adyacente contra moribundo o inconsciente: muerte automática. A distancia requiere ataque contra Defensa 10 |
| Iniciativa | Destreza (Iniciativa). No se repite cada asalto. PNJ principales individuales, secundarios por grupos. Quien se une tira al comienzo de su asalto |
| Preparar | No se puede si ya se realizó una acción mayor en el turno |
| Generación de atributos | El compendio dice "el orden que establece el procedimiento"; confirma el orden en el Manual del Jugador |

Pendientes de verificar en la Fase 3: el catálogo cerrado de estados (compendio y manuales muestran derribado, inmovilizado, paralizado, inconsciente y moribundo, sin lista oficial) y las reglas de varita, ausente de las tablas. Los efectos no catalogados se marcan como "efecto libre del DJ".

## 4. Fases

Cada fase termina en una aplicación funcional. Mobile First aplica desde la primera pantalla: diseña a 375 px y amplía después. Objetivos táctiles de al menos 44 px; las tablas anchas se convierten en tarjetas.

### Fase 1 — Cimientos
Git, proyecto, lint de límites, tests, `CLAUDE.md`, `docs/ARCHITECTURE.md` breve, `docs/RULES_ERRATA.md`, `docs/RULES_GAPS.md`, `docs/SECURITY.md`, shell con router, tokens visuales, registro de módulos y PWA instalable.
**Salida:** la app se instala y abre sin conexión; un módulo de ejemplo se añade tocando solo su manifiesto y el registro; el lint rechaza una importación prohibida.

### Fase 2 — Perfiles, datos y llave
Perfiles completos, Dexie, registro de stores, borrado en cascada, `.dageprofile` con snapshots, ajustes, formato `.dagekey`, `tools/keygen`, permisos y layout DJ protegido.
**Salida:** todos los casos de la sección 5 para perfiles, llave e importación pasan; el flujo funciona en Chromium y WebKit móviles de Playwright.

### Fase 3 — Contenido y motor de reglas
- `rules/`: tiradas con dado dragón y RNG inyectable, dobles, PP, enfrentadas con desempate, avanzadas, derivados, ataque, daño, hechizos, recuperación, proezas.
- `content/`: transcribe a TypeScript o JSON validado con Zod, **no con parser**. Incluye clases, trasfondos con tablas 2d6, talentos, armas, armaduras, hechizos, proezas, criaturas, PNJ, objetos, modificadores y tablas. Cada registro lleva `source: { book, section, page? }` y `audience: "player" | "dm"`.
- Texto narrativo: divide el compendio por encabezados en un script de build, con clasificación explícita por sección. Secciones 1 a 6 jugador; 8 a 11 DJ; en la 7, 7.1 a 7.8, 7.10 y 7.11 jugador, y el resto se decide contrastando el manual de origen y se documenta.
- `rulebook` con búsqueda MiniSearch por nombre, categoría y contenido. El índice de jugador no incluye contenido del DJ. Lanzador de dados.

**Salida:** tests de todas las fórmulas; recuentos de datos comprobados por test (22 talentos, 18 hechizos, 7 trasfondos); una búsqueda como jugador no devuelve contenido del DJ; contraste de muestra de hechizos y criaturas con los PDF, con desviaciones registradas.

### Fase 4 — Jugador
Asistente de creación de 8 pasos con validación, ficha, subida de nivel, inventario, equipo, dinero, grimorio y notas. Las tiradas desde la ficha usan el motor. Exportación `.dagechar`.
**Salida:** crear los tres arquetipos de clase, recargar la app y encontrar los mismos datos; los valores derivados coinciden con ejemplos de los manuales; la ficha es usable en móvil.

### Fase 5 — Dirección y combate
Panel DJ, biblioteca de criaturas (originales inmutables; las personalizadas son registros nuevos), PNJ, importación de PJ vinculados, constructor de encuentros y módulo `combat`.

`combat` inicial, manual:
- Iniciativa, turno, ronda, reordenación, participantes añadidos o retirados en caliente.
- Tarjetas con Salud, Maná, Defensa, Armadura, estados y efectos temporales.
- Daño, curación y maná en pocos toques.
- Registro de acontecimientos.
- En móvil: barra inferior al alcance del pulgar, turno siempre visible y sin cambiar de pantalla para acciones frecuentes.
- El combate en curso se persiste y sobrevive a cerrar la app.

Después, asistencia opcional: tiradas y daño sugeridos por el motor, siempre confirmados por el DJ. **No se implementa simulación automática de bandos:** requeriría decisiones tácticas que el reglamento no define. Si se desea más adelante, será una función aparte y etiquetada como no oficial.

**Salida:** ejecutar de principio a fin el primer combate de *La maldición dalishana* en viewport móvil.

### Fase 6 — Campañas
Campañas, aventuras, sesiones, localizaciones, eventos, recompensas y notas secretas, enlazadas con encuentros y PNJ. Incluye *La maldición dalishana* como aventura de solo lectura clonable.
**Salida:** preparar una sesión con encuentro y lanzarla desde `combat`; `.dagecampaign` funciona.

### Fase 7 — Estabilización
Auditoría de rendimiento y accesibilidad, pruebas en dispositivos reales con iPhone y Android, migración desde datos de fases anteriores, revisión de `SECURITY.md`, guía de usuario y de generación de llaves.

## 5. Pruebas mínimas

- **Perfiles:** creación, recuperación automática, cambio, aislamiento, borrado sin huérfanos.
- **Llave:** válida, truncada, manipulada en cada zona, firma incorrecta, otro perfil, caducada, `keyId` desconocido, persistencia y revalidación al arrancar.
- **Import/export:** ida y vuelta sin pérdida, checksum alterado, versión antigua migrada, versión futura rechazada, conflicto, importar como independiente pierde la llave, restauración de snapshot.
- **Reglas:** dobles en dos dados cualesquiera, PP igual al dado dragón solo con éxito, empates, armadura y penetrante, sin entrenamiento, Fuerza mínima, coste de hechizo con armadura, Salud no negativa.
- **E2E móvil:** crear personaje → cerrar → reabrir → importar llave → modo DJ → combate → borrar perfil.

## 6. Fuera de alcance

Cuentas, backend, sincronización en la nube, multijugador en tiempo real, tablero o mapa táctico, contenido más allá de la Caja Básica y reglas de nivel superior a 5. La arquitectura de repositorios permite añadir un backend más adelante, pero no se construyen abstracciones adicionales para ello.

## 7. Decisiones por defecto que puedes cambiar

- Hosting estático privado por HTTPS; el proveedor se elige en la Fase 7.
- Contenido del DJ sin cifrar, con la limitación documentada.
- PJ entre dispositivos mediante archivo `.dagechar`.
- Sin simulador automático de bandos.

## 8. Prompt inicial para Sonnet

> Lee `PLAN_v2.md`. Ejecuta **solo la Fase 1**. Las fuentes de reglas están en `../Manuales/Set 1/`; consúltalas solo cuando la tarea lo requiera. Al terminar, ejecuta las comprobaciones, resume lo hecho y espera mi confirmación antes de pasar a la Fase 2.

Abre una sesión nueva por fase, cambiando el número: `CLAUDE.md` y `docs/` mantienen la continuidad.

