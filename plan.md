# PROYECTO: DRAGON AGE DM STATION
## Aplicación modular de gestión de partidas y herramientas de Dungeon Master

Actúa como arquitecto de software senior, diseñador de producto y desarrollador full-stack especializado en aplicaciones modulares, escalables y mantenibles.

Quiero desarrollar una aplicación llamada provisionalmente **Dragon Age DM Station**, destinada a gestionar partidas de rol de Dragon Age y proporcionar herramientas tanto a jugadores como al Director de Juego (DJ).

Te proporcionaré un archivo Markdown que contiene la información recopilada de los dos manuales de la Caja Básica de Dragon Age:

- Manual del Jugador.
- Manual del Director de Juego.

Este documento será la principal fuente de información para implementar las reglas, los datos, los contenidos y las herramientas de la aplicación.

**No quiero una aplicación de demostración ni una interfaz con botones que todavía no hacen nada. Quiero construir una aplicación real, funcional y preparada para crecer durante meses o años.**

---

# 1. FILOSOFÍA GENERAL DEL PROYECTO

La aplicación debe cumplir cinco principios fundamentales:

1. Arquitectura modular: cada funcionalidad debe estar separada y organizada.
2. Persistencia local: los usuarios no necesitan crear cuentas ni iniciar sesión mediante correo electrónico o contraseña.
3. Separación de permisos: los jugadores tendrán acceso a sus herramientas y el DJ tendrá acceso a funcionalidades adicionales.
4. Escalabilidad: añadir nuevas funcionalidades no debe obligar a modificar o romper módulos que ya funcionan.
5. Fidelidad al reglamento: las herramientas de juego deben aplicar correctamente las reglas de Dragon Age recogidas en los manuales proporcionados.

La aplicación debe poder comenzar siendo relativamente pequeña y evolucionar hasta convertirse en una estación de gestión completa para campañas de rol.

No construyas toda la aplicación en un único archivo ni concentres toda la lógica en componentes gigantes.

Quiero una arquitectura profesional, modular y documentada.

# 2. SISTEMA DE PERFILES Y ACCESO

Esta es una de las partes más importantes del proyecto.

No quiero un sistema de registro tradicional.

## 2.1. Perfiles de jugadores

Cuando una persona abra la aplicación por primera vez:

1. Aparecerá una pantalla de bienvenida.
2. Se solicitará únicamente un nombre.
3. Se creará automáticamente un perfil local.
4. Se asignará un identificador interno único al perfil.
5. Se accederá directamente a su espacio personal.

No debe solicitarse correo electrónico, contraseña ni ningún tipo de registro online.

La aplicación guardará los datos localmente en el dispositivo.

Cuando vuelva a abrirla, debe recuperar automáticamente el último perfil utilizado, sin pedir nuevamente el nombre.

Debe existir un selector de perfiles para permitir:

- Crear otro perfil.
- Cambiar entre perfiles existentes.
- Consultar los perfiles guardados.
- Eliminar un perfil.

### Eliminación de perfiles

Al eliminar un perfil, debe eliminarse toda la información asociada exclusivamente a él:

- Personajes.
- Inventarios.
- Equipamiento.
- Hechizos y talentos guardados.
- Notas.
- Configuraciones.
- Datos específicos del perfil.
- Credenciales del DJ asociadas a dicho perfil.

La eliminación debe realizarse de forma consistente, evitando datos huérfanos.

Antes de eliminarlo, debe aparecer una confirmación indicando que la operación es irreversible.

Los datos de otros perfiles no deben verse afectados.

## 2.2. Persistencia

Utiliza IndexedDB como almacenamiento principal de datos.

No utilices localStorage como base de datos principal.

Puedes reservar localStorage para preferencias sencillas, como el último perfil activo o determinados ajustes visuales.

La aplicación debe:

- Guardar automáticamente los cambios.
- Mantener los datos después de cerrar el navegador.
- Soportar múltiples perfiles independientes.
- Disponer de un sistema de exportación e importación de copias de seguridad.
- Tener un esquema de datos versionado.
- Permitir migraciones cuando se actualice la aplicación.

Quiero evitar que una actualización futura provoque que los usuarios pierdan sus personajes o campañas.

## 2.3. Perfil del Director de Juego

El DJ también tendrá un perfil local normal, con nombre e identificador propio.

La diferencia es que podrá habilitar permisos adicionales mediante una llave digital.

El perfil del DJ no debe ser un usuario global separado del sistema de perfiles: debe ser un perfil normal al que se le conceden permisos especiales.

---

# 3. SISTEMA DE LLAVE DIGITAL DEL DJ

Quiero que el acceso al modo Director de Juego funcione mediante un archivo binario que actuará como llave.

El procedimiento será el siguiente:

1. Se crea un perfil introduciendo un nombre.
2. La persona obtiene su identificador único de perfil.
3. El propietario de la aplicación genera un archivo de autorización vinculado a ese identificador.
4. El usuario importa ese archivo desde la aplicación.
5. La aplicación lee el contenido binario.
6. Comprueba que el archivo tiene el formato correcto.
7. Verifica criptográficamente su autenticidad.
8. Comprueba que está vinculado al perfil activo.
9. Si todo es correcto, habilita el modo Director de Juego.

Si el archivo es incorrecto, está manipulado, está corrupto o pertenece a otro perfil, debe rechazarse.

### Requisitos técnicos de seguridad

No quiero una simple comparación de cadenas, contraseñas o archivos con un contenido predeterminado.

Implementa un sistema de firma digital asimétrica, preferiblemente Ed25519 mediante una biblioteca criptográfica reconocida.

El funcionamiento debe ser:

- La clave privada de firma permanece fuera de la aplicación.
- La aplicación solamente contiene la clave pública necesaria para verificar autorizaciones.
- Un pequeño script o herramienta independiente permitirá generar archivos de autorización.
- El archivo tendrá un formato binario versionado y una extensión propia, por ejemplo `.dagekey`.
- Su contenido firmado incluirá como mínimo el identificador de perfil, identificador de autorización, versión de formato, aplicación de destino y permisos concedidos.
- La fecha de caducidad será opcional.
- La aplicación verificará la firma antes de aceptar el archivo.

Una vez importada correctamente, la autorización debe almacenarse localmente y volver a validarse al iniciar la aplicación.

El usuario no tendrá que importar la llave cada vez que abra la aplicación.

La autorización debe estar ligada al identificador del perfil, no solamente al nombre.

**Importante:** no guardes un simple booleano `isAdmin = true` como mecanismo de autorización. Guarda y verifica la credencial firmada.

La implementación debe documentar las limitaciones de seguridad de un sistema completamente local. No incluyas secretos privados ni mecanismos criptográficos caseros en el código cliente.

El sistema debe permitir ampliar en el futuro los permisos y tipos de autorización sin tener que rediseñarlo entero.

Por ejemplo, podría haber permisos específicos para:

- Acceso al compendio del DJ.
- Gestión de campañas.
- Simulador de combate.
- Gestión de encuentros.
- Herramientas avanzadas.

Inicialmente, todos estos permisos podrán formar parte de una única autorización de DJ.

---

# 4. DOS ESPACIOS DE TRABAJO

La aplicación tendrá dos grandes entornos.

## 4.1. Modo Jugador

Es el espacio habitual de los jugadores.

Debe permitir gestionar su información y sus personajes sin tener acceso a las herramientas exclusivas del DJ.

Funcionalidades iniciales:

**Gestión de personajes**
- Crear personajes.
- Modificar personajes.
- Consultar fichas.
- Guardar distintos personajes dentro del perfil.
- Eliminar personajes.
- Consultar su evolución.

**Hoja de personaje**

Debe permitir gestionar todos los elementos correspondientes a Dragon Age:

- Nombre.
- Raza y trasfondo.
- Clase.
- Nivel.
- Experiencia.
- Atributos.
- Concentraciones.
- Talentos.
- Aptitudes de clase.
- Hechizos.
- Salud.
- Defensa.
- Armadura.
- Velocidad.
- Armas.
- Ataque y daño.
- Equipo.
- Dinero.
- Idiomas.
- Objetivos y vínculos.
- Concepto y personalidad.

Los datos y cálculos deben respetar el sistema de creación de personajes de los manuales.

**Inventario**
- Añadir y quitar objetos.
- Equipar y desequipar armas y armaduras.
- Consultar estadísticas de objetos.
- Gestionar dinero.
- Consultar el equipo transportado.

**Notas personales**
- Historia del personaje.
- Objetivos.
- Relaciones.
- Notas de interpretación.
- Información descubierta durante las partidas.

**Consulta de reglas**

Permitir consultar el contenido del Manual del Jugador mediante un compendio organizado y buscable.

## 4.2. Modo Director de Juego

Este modo solamente estará disponible para perfiles con una autorización válida.

Debe tener su propio panel de control, navegación y funcionalidades.

No debe ser simplemente el modo jugador con más botones.

Quiero una auténtica estación de trabajo para dirigir partidas.

Funcionalidades iniciales:

**Gestión de personajes**
- Crear personajes.
- Crear PNJ.
- Editar fichas.
- Consultar atributos, talentos, capacidades y estadísticas.
- Guardar personajes y PNJ en bibliotecas.
- Duplicar personajes.

**Biblioteca de criaturas y adversarios**
- Consultar criaturas del manual.
- Consultar sus estadísticas.
- Clasificar adversarios.
- Consultar habilidades y comportamientos.
- Añadir criaturas personalizadas.
- Guardar nuevas criaturas sin modificar los datos originales.

**Compendio del Director de Juego**

Debe permitir consultar también la información exclusiva del Manual del DJ:

- Reglas avanzadas.
- Criaturas.
- Adversarios.
- Recompensas.
- Consejos de dirección.
- Encuentros.
- Información de aventuras.
- Tablas y referencias.

**Tiradas de dados**
- Lanzador de dados.
- Tiradas de atributos.
- Tiradas enfrentadas.
- Tiradas de ataque.
- Tiradas de hechizos.
- Visualización del dado dragón.
- Detección de dobles.
- Cálculo de puntos de proeza.
- Historial de tiradas.

**Simulador de combate**

Una de las herramientas más importantes.

Debe permitir configurar y simular enfrentamientos entre personajes, PNJ y criaturas.

Debe contemplar las mecánicas correspondientes del reglamento:

- Iniciativa.
- Orden de turnos.
- Acciones mayores y menores.
- Movimiento.
- Ataques cuerpo a cuerpo.
- Ataques a distancia.
- Defensa.
- Armadura.
- Salud.
- Daño.
- Proezas.
- Estados y efectos.
- Hechizos.
- Muerte y consecuencias del combate.

Debe permitir introducir participantes, consultar sus estadísticas y llevar un registro de lo sucedido.

El simulador debe utilizar las reglas reales del juego y no inventar mecánicas.

Siempre que una mecánica no esté suficientemente especificada en el documento, debe identificarse como pendiente de definición y no implementarse como una regla oficial.

**Gestión de encuentros**

- Crear encuentros.
- Añadir enemigos.
- Añadir PNJ.
- Añadir personajes.
- Guardar encuentros preparados.
- Consultar estadísticas de los participantes.
- Asociar encuentros a una sesión o aventura.

**Gestión de partidas y campañas**

Diseña una estructura que permita añadir progresivamente:

- Campañas.
- Aventuras.
- Sesiones.
- Localizaciones.
- PNJ.
- Criaturas.
- Notas del DJ.
- Eventos.
- Recompensas.
- Información secreta.

No hace falta implementar absolutamente todas estas funciones en la primera versión, pero la arquitectura debe contemplarlas.

---

# 5. COMPENDIO Y BASE DE CONOCIMIENTOS

El archivo Markdown que proporcionaré es la fuente principal de información del proyecto.

Debe aprovecharse para construir una base de conocimientos interna y estructurada.

No quiero que el contenido del manual aparezca desordenado como un único bloque de texto.

Organízalo por categorías:

- Lore.
- Geografía.
- Historia.
- Razas.
- Trasfondos.
- Clases.
- Atributos.
- Concentraciones.
- Talentos.
- Aptitudes.
- Magia.
- Hechizos.
- Equipo.
- Armas.
- Armaduras.
- Reglas.
- Combate.
- Proezas.
- Criaturas.
- PNJ.
- Recompensas.
- Dirección de partidas.
- Aventuras.
- Tablas de referencia.

El compendio debe permitir búsquedas por nombre, categoría y contenido.

Siempre que sea posible, los datos mecánicos deben estar estructurados, no únicamente almacenados como texto.

Por ejemplo, un hechizo debería poder tener campos para:

- Nombre.
- Escuela.
- Tipo.
- Coste de maná.
- Preparación.
- Número objetivo.
- Tirada.
- Alcance, cuando corresponda.
- Efecto.
- Duración.
- Requisitos adicionales.

Lo mismo debe aplicarse a criaturas, armas, armaduras, talentos y demás elementos que tengan información mecánica.

### Separación de información

Clasifica el contenido según corresponda al Manual del Jugador o al Manual del DJ.

El jugador no debe ver directamente las secciones exclusivas del DJ desde la navegación normal.

El Director de Juego debe disponer de acceso a ambos manuales.

No inventes contenido para completar campos vacíos.

No conviertas interpretaciones o hipótesis en reglas oficiales.

Conserva la terminología del documento proporcionado y permite rastrear de qué sección procede cada dato.

---

# 6. ARQUITECTURA Y ESCALABILIDAD

Esta es probablemente la condición técnica más importante de todo el proyecto.

**Quiero poder seguir añadiendo funcionalidades durante mucho tiempo sin que cada nueva implementación rompa las anteriores.**

Diseña una arquitectura modular, preferiblemente un monolito modular bien organizado.

No quiero microservicios innecesarios ni un sistema de plugins excesivamente complejo desde el primer día.

Quiero módulos independientes con responsabilidades claras.

Como mínimo, contempla las siguientes capas:

### Core
Responsable de los servicios fundamentales:

- Inicialización.
- Navegación.
- Perfiles.
- Persistencia.
- Gestión de permisos.
- Verificación de llaves.
- Configuración.
- Notificaciones.
- Sistema de búsqueda.
- Registro de errores.

### Data
Responsable de:

- Modelos de datos.
- Esquemas de validación.
- Repositorios.
- Relaciones.
- Migraciones.
- Importación y exportación.

### Rules Engine
Motor independiente de reglas Dragon Age.

Debe encargarse de:

- Cálculos de atributos.
- Tiradas.
- Modificadores.
- Ataques.
- Daño.
- Defensa.
- Armadura.
- Proezas.
- Magia.
- Reglas de combate.

No quiero que las reglas estén implementadas directamente dentro de los componentes visuales.

Por ejemplo, si modificamos el cálculo de una proeza, debe bastar con modificar el módulo correspondiente sin tener que revisar toda la interfaz.

### Features

Cada funcionalidad debe estar separada en su propio módulo.

Ejemplos:

- `character-management`
- `inventory`
- `spellbook`
- `dice-roller`
- `rulebook`
- `creature-library`
- `npc-manager`
- `encounter-builder`
- `combat-simulator`
- `campaign-manager`
- `session-manager`

Cada módulo debe tener una estructura coherente que separe:

- Interfaz.
- Lógica.
- Servicios.
- Modelos.
- Validaciones.
- Tests.

Debe existir un mecanismo centralizado para registrar módulos, sus rutas y sus elementos de navegación.

Añadir un nuevo módulo debería requerir integrarlo en ese registro y respetar los contratos definidos, no modificar diez archivos centrales.

### Reglas de aislamiento

- Los componentes visuales no deben acceder directamente a IndexedDB.
- Los módulos deben comunicarse mediante interfaces y servicios definidos.
- Las funcionalidades no deben depender innecesariamente de implementaciones internas de otros módulos.
- Los datos deben validarse antes de guardarse.
- Los cambios en los modelos deben gestionarse mediante migraciones.
- Las funcionalidades nuevas no deben romper los datos existentes.
- Los errores deben gestionarse de forma centralizada.
- La lógica de dominio debe poder probarse sin cargar la interfaz.

La arquitectura debe permitir sustituir o ampliar el almacenamiento local por un backend en el futuro, sin tener que reconstruir todas las funcionalidades.

---

# 7. TECNOLOGÍA Y CALIDAD DEL CÓDIGO

Inspecciona primero el proyecto y su estructura actual.

Si ya existe una base de código, conserva lo que esté bien implementado y aprovecha las tecnologías existentes.

No reconstruyas todo por capricho.

Si el proyecto está vacío, elige una pila moderna y adecuada para una aplicación local-first, priorizando:

- TypeScript.
- Componentes reutilizables.
- Arquitectura modular.
- IndexedDB.
- Validación de esquemas.
- Testing automatizado.
- Facilidad de mantenimiento.

La interfaz debe ser responsive y funcionar correctamente en escritorio y tablet.

Todo el contenido visible debe estar en español.

La interfaz debe tener una estética de fantasía oscura medieval, elegante y legible. Puede inspirarse visualmente en la ambientación de Dragon Age, pero debe mantener una identidad visual propia.

No sacrifiques usabilidad por estética.

---

# 8. PRUEBAS Y VALIDACIÓN

No consideres terminada ninguna funcionalidad simplemente porque aparece en pantalla.

Debe funcionar.

Implementa pruebas para los aspectos críticos:

**Perfiles**
- Creación.
- Recuperación automática.
- Cambio de perfil.
- Persistencia.
- Eliminación completa.
- Aislamiento entre perfiles.

**Llave del DJ**
- Archivo válido.
- Archivo inválido.
- Archivo manipulado.
- Archivo corrupto.
- Archivo vinculado a otro perfil.
- Persistencia de la autorización.

**Reglas**
- Fórmulas.
- Tiradas.
- Dado dragón.
- Dobles.
- Puntos de proeza.
- Combate.
- Daño.
- Armadura.
- Hechizos.

**Integración**
- Crear un personaje.
- Guardarlo.
- Cerrar y volver a abrir.
- Recuperarlo.
- Importar una llave.
- Acceder al modo DJ.
- Ejecutar una herramienta.
- Eliminar un perfil y comprobar que se elimina su información asociada.

Cada nueva funcionalidad deberá incluir sus correspondientes pruebas.

Antes de dar por terminada una fase, ejecuta:

- Tests.
- Comprobación de tipos.
- Compilación.
- Verificación de las funcionalidades principales.

Corrige los errores detectados antes de continuar.

---

# 9. FORMA DE TRABAJO

No empieces creando todas las pantallas a la vez.

Quiero que trabajes por fases para que podamos construir una aplicación estable.

### FASE 1. Auditoría y arquitectura

Inspecciona el proyecto y el Markdown.

Define:

- Arquitectura propuesta.
- Estructura de carpetas.
- Módulos.
- Modelos de datos.
- Sistema de perfiles.
- Sistema de autorización del DJ.
- Estrategia de persistencia.
- Plan de pruebas.

Documenta las decisiones en un archivo `ARCHITECTURE.md`.

No te limites a presentar un plan: después de documentarlo, comienza su implementación.

### FASE 2. Core y perfiles

Implementa:

- Aplicación base.
- Navegación.
- Creación de perfiles.
- Recuperación automática.
- Selector de perfiles.
- Eliminación.
- Persistencia.
- Copias de seguridad.
- Sistema de permisos.
- Importación y verificación de la llave del DJ.

Al terminar, esta fase debe ser completamente funcional.

### FASE 3. Compendio y motor de reglas

Implementa:

- Ingesta del Markdown.
- Clasificación del contenido.
- Búsqueda.
- Base de datos estructurada.
- Motor de reglas.
- Tiradas de dados.
- Dado dragón.
- Proezas.

### FASE 4. Herramientas de jugador

Implementa:

- Gestor de personajes.
- Hojas de personaje.
- Atributos.
- Talentos.
- Hechizos.
- Inventario.
- Equipo.
- Notas.

### FASE 5. Herramientas del DJ

Implementa:

- Panel del DJ.
- Biblioteca de criaturas.
- Gestión de PNJ.
- Herramientas avanzadas de dados.
- Gestor de encuentros.
- Simulador de combate.

### FASE 6. Gestión de campañas

Implementa progresivamente:

- Campañas.
- Aventuras.
- Sesiones.
- Registro de eventos.
- Notas privadas.
- Relaciones entre personajes, encuentros y localizaciones.

### FASE 7. Estabilización

Realiza una revisión completa:

- Errores.
- Rendimiento.
- Persistencia.
- Seguridad de la autorización.
- Consistencia de los datos.
- Interfaz.
- Pruebas.
- Documentación.

---

# 10. REQUISITOS PARA TODAS LAS FUTURAS AMPLIACIONES

Quiero establecer una norma permanente para este proyecto:

**Cada nueva funcionalidad debe integrarse en la arquitectura existente, sin deteriorar ni duplicar innecesariamente lo que ya funciona.**

Cuando se solicite una ampliación:

1. Inspecciona primero los módulos existentes.
2. Identifica dónde debe integrarse.
3. Comprueba qué componentes y servicios se pueden reutilizar.
4. Implementa la funcionalidad dentro del módulo correspondiente.
5. Actualiza los modelos y migraciones si es necesario.
6. Añade pruebas.
7. Comprueba que las funcionalidades anteriores siguen funcionando.
8. Actualiza la documentación.

No soluciones problemas creando excepciones temporales que luego se conviertan en deuda técnica.

No dupliques motores de cálculo, sistemas de almacenamiento ni componentes que ya existan.

Si una nueva funcionalidad requiere modificar una interfaz central, hazlo mediante contratos extensibles y compatibles con los módulos existentes.

Mantén un registro de decisiones arquitectónicas y cambios importantes.

---

# 11. RESULTADO ESPERADO

Quiero una aplicación que pueda convertirse progresivamente en una auténtica estación de trabajo para Dragon Age.

El objetivo no es tener una colección de calculadoras independientes.

El objetivo es que todos los sistemas estén conectados.

Por ejemplo:

- Un personaje creado desde el gestor debe poder utilizarse en el simulador de combate.
- Una criatura de la biblioteca debe poder añadirse directamente a un encuentro.
- Un encuentro debe poder incorporarse a una sesión.
- Las tiradas deben poder realizarse desde diferentes herramientas utilizando el mismo motor.
- Los hechizos deben compartir los mismos datos entre el compendio, la ficha de personaje y el combate.
- El DJ debe poder consultar los manuales y gestionar la información de sus partidas desde un único entorno.

Quiero que la aplicación tenga coherencia interna y que sus diferentes herramientas compartan información cuando tenga sentido.

**Prioridades absolutas, por orden:**

1. Funcionamiento real.
2. Persistencia fiable de datos.
3. Arquitectura modular.
4. Fidelidad a las reglas.
5. Seguridad y separación de permisos.
6. Facilidad para añadir nuevas funciones.
7. Experiencia de usuario.

No sacrifiques ninguna de las primeras seis prioridades por terminar antes.

Empieza inspeccionando el proyecto y el documento Markdown proporcionado. Identifica las decisiones técnicas necesarias y comienza a construir la primera versión funcional.

No quiero que te limites a diseñar una arquitectura o presentar una propuesta: quiero que implementes, pruebes y documentes el producto progresivamente.

## MÓDULOS Y REQUISITOS ADICIONALES OBLIGATORIOS

### 1. Gestor de Combate

La aplicación debe incluir un módulo completo de **Gestor de Combate**, diseñado para facilitar al Director de Juego la administración de enfrentamientos durante las partidas.

Este módulo debe integrar dos vistas principales:

#### A. Orden de iniciativa
- Mostrar a todos los participantes del combate en una lista ordenada por iniciativa.
- Identificar claramente quién tiene el turno actual.
- Permitir avanzar al siguiente turno y comenzar una nueva ronda.
- Permitir modificar manualmente el orden de iniciativa.
- Permitir añadir y retirar participantes durante el combate.
- Marcar qué participantes ya han realizado su turno.
- Mostrar el número de ronda y el participante que debe actuar.

#### B. Panel de estado del combate

Cada participante debe disponer de una tarjeta individual con su información relevante:

- Nombre y retrato, si dispone de uno.
- Puntos de salud actuales y máximos.
- Maná actual y máximo, cuando corresponda.
- Defensa.
- Armadura.
- Estado actual: activo, inconsciente, muerto u otros estados contemplados por las reglas.
- Efectos temporales, condiciones y estados alterados.
- Indicador visual de si le corresponde actuar.

El Director de Juego debe poder realizar acciones rápidas:

- Añadir o restar puntos de salud.
- Aplicar daño o curación.
- Añadir o recuperar maná.
- Aplicar y retirar estados alterados.
- Gestionar efectos temporales y su duración.
- Consultar las estadísticas completas de cualquier participante.
- Consultar un registro de los acontecimientos del combate.

La interfaz debe permitir modificar estos valores rápidamente, sin tener que abandonar el gestor ni abrir constantemente las fichas individuales.

**Importante:** El sistema debe funcionar inicialmente como una herramienta de gestión manual para el Director de Juego. No debe automatizar decisiones narrativas ni modificar estadísticas por su cuenta. La automatización de tiradas, ataques, daños, proezas y otras mecánicas podrá incorporarse progresivamente mediante el motor de reglas existente.

El gestor debe reutilizar los datos originales de personajes, PNJ y criaturas. No se deben crear copias independientes de sus fichas para cada combate. Los cambios que deban persistir en el personaje original deben gestionarse correctamente, evitando inconsistencias entre módulos.

### 2. Diseño Mobile First y aplicación multidispositivo

La aplicación debe desarrollarse con un enfoque **Mobile First**. No basta con que la interfaz de escritorio se reduzca para caber en una pantalla pequeña: la experiencia móvil debe estar diseñada específicamente para su uso durante una partida de rol.

La aplicación debe funcionar correctamente en:

- Ordenadores Windows, macOS y Linux.
- Teléfonos Android.
- iPhone y iPad.

Se debe implementar como aplicación web responsive y, siempre que sea viable, como **PWA instalable**, permitiendo utilizarla desde el dispositivo como si fuera una aplicación nativa.

#### Requisitos de interfaz móvil
- Diseño adaptable a diferentes tamaños y orientaciones de pantalla.
- Botones y controles táctiles con dimensiones adecuadas.
- Navegación compacta y sencilla.
- Menús optimizados para pantallas pequeñas.
- Formularios adaptados al uso táctil.
- Evitar tablas excesivamente anchas; convertirlas en tarjetas o diseños alternativos cuando sea necesario.
- Priorizar la información importante y las acciones frecuentes.
- Evitar ventanas y paneles que dificulten la navegación.
- Mantener una buena legibilidad sin necesidad de ampliar constantemente la pantalla.

#### Prioridad especial: Gestor de Combate en móvil

El Gestor de Combate debe recibir un tratamiento especial en dispositivos móviles, ya que será una de las herramientas que más se utilizarán durante las sesiones.

Debe permitir:
- Consultar rápidamente el orden de iniciativa.
- Identificar el turno actual.
- Modificar salud y maná con pocos toques.
- Aplicar daño y curación sin navegar entre múltiples pantallas.
- Consultar los estados de los participantes.
- Cambiar de participante o avanzar el turno fácilmente.

La distribución debe priorizar la rapidez de uso, la visibilidad de la información y la posibilidad de manejar las acciones habituales con una sola mano cuando el tamaño del dispositivo lo permita.

#### Funcionamiento sin conexión

La aplicación debe mantener sus funcionalidades principales disponibles sin conexión a Internet.

La ausencia de conexión no debe impedir:
- Consultar perfiles y personajes.
- Gestionar inventarios y fichas.
- Consultar el compendio.
- Utilizar el lanzador de dados.
- Gestionar combates.
- Administrar campañas y sesiones.
- Guardar cambios localmente.

La sincronización con servicios externos no es un requisito de esta arquitectura. La persistencia local debe seguir siendo la fuente principal de datos.

### 3. Exportación, importación y transferencia de perfiles entre dispositivos

Al tratarse de una aplicación local, es imprescindible ofrecer un sistema fiable para trasladar perfiles completos entre dispositivos.

Se debe implementar un sistema de exportación e importación mediante archivos propios de la aplicación.

#### Formato de archivo

Utilizar la extensión:

`.dageprofile`

Este archivo debe contener todos los datos necesarios para reconstruir un perfil en otro dispositivo.

Debe incluir, como mínimo:
- Identificador único del perfil.
- Nombre del perfil.
- Personajes y sus fichas completas.
- Atributos, habilidades, talentos y especializaciones.
- Inventario, equipo y objetos.
- Hechizos y habilidades.
- Notas y configuraciones personales.
- Campañas, aventuras y sesiones creadas por ese perfil, cuando corresponda.
- Cualquier otro dato relacionado con el perfil que sea necesario para restaurar su estado.

El formato debe estar versionado para permitir futuras modificaciones de la estructura de datos sin perder compatibilidad con archivos anteriores.

#### Exportación

Desde el selector o apartado de gestión de perfiles, el usuario debe poder:

- Exportar un perfil completo a un archivo `.dageprofile`.
- Elegir dónde guardar el archivo.
- Crear copias de seguridad manuales.
- Exportar personajes individuales cuando resulte útil.
- Exportar campañas o aventuras de manera independiente si la arquitectura lo permite.

La exportación debe generar un archivo íntegro y válido, no limitarse a copiar determinados campos de la base de datos.

#### Importación

Desde otro dispositivo, el usuario debe poder seleccionar un archivo `.dageprofile` e importar su contenido.

El proceso debe:

1. Leer y validar el archivo.
2. Comprobar que su estructura y versión sean compatibles.
3. Identificar el perfil y su ID original.
4. Comprobar si ya existe un perfil con ese identificador.
5. Mostrar al usuario qué información se va a importar.
6. Permitir cancelar la operación antes de modificar los datos.
7. Restaurar el perfil y sus relaciones correctamente.
8. Confirmar que la importación ha finalizado correctamente.

La importación no debe sobrescribir silenciosamente un perfil existente. Si hay conflictos, debe ofrecer opciones claras para resolverlos, como cancelar, importar como perfil independiente o sustituir el perfil existente previa confirmación.

#### Conservación de la identidad del perfil

La transferencia debe conservar el ID original del perfil cuando se restaure en otro dispositivo.

El objetivo es que un usuario pueda utilizar exactamente el mismo perfil en su ordenador y en su teléfono, sin tener que crear personajes nuevos ni reconstruir manualmente sus datos.

La aplicación debe permitir que el usuario transfiera el archivo mediante USB, correo electrónico, almacenamiento en la nube, Telegram u otros medios externos. No es necesario implementar estos servicios dentro de la aplicación.

#### Gestión de versiones y conflictos

Es importante distinguir entre transferencia y sincronización.

La importación y exportación mediante archivos no constituye una sincronización automática entre dispositivos.

Por ejemplo, si el usuario exporta su perfil desde el ordenador, lo importa en el móvil y después modifica ambos dispositivos por separado, existirán dos versiones diferentes del mismo perfil.

La aplicación debe contemplar esta situación:
- Registrar información de versión y fecha de modificación.
- Advertir cuando se importe una versión potencialmente más antigua.
- Evitar sobrescrituras accidentales.
- Ofrecer mecanismos seguros para restaurar una copia anterior.
- Mantener la integridad de los datos durante las operaciones de importación y exportación.

No implementar una sincronización automática en la nube como sustituto de este sistema. La prioridad es que el usuario tenga control total sobre sus archivos y sus datos.

### 4. Criterio de implementación

Estas funcionalidades no deben desarrollarse como añadidos aislados ni como demostraciones visuales.

Deben integrarse en la arquitectura existente, reutilizando los modelos, servicios, repositorios y componentes ya implementados.

Antes de desarrollar cada funcionalidad:

1. Inspeccionar la arquitectura y los módulos existentes.
2. Identificar qué funcionalidades y estructuras pueden reutilizarse.
3. Evitar duplicar modelos, lógica de negocio o almacenamiento.
4. Integrar los nuevos módulos mediante las interfaces y servicios correspondientes.
5. Añadir pruebas unitarias y de integración.
6. Comprobar que no se hayan introducido regresiones en las funcionalidades existentes.

**Prioridades de desarrollo:**
1. Funcionamiento real de todas las funcionalidades.
2. Persistencia y protección de los datos.
3. Compatibilidad entre dispositivos.
4. Usabilidad móvil durante una partida.
5. Integración correcta con el motor de reglas.
6. Modularidad y facilidad de ampliación.

El resultado debe ser una herramienta funcional que permita gestionar una partida completa desde el ordenador o desde el teléfono, conservando los mismos perfiles y datos mediante exportación e importación.