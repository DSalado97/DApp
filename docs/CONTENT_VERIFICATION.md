# Verificación del contenido contra los PDF (Fase 3)

Fecha: 2026-11-10. Método: `pdftotext` sobre el Manual del Jugador y el Manual del Narrador (salida en latin1 → UTF-8, con y sin `-layout`), comparación con lo transcrito del compendio y registro de las desviaciones en `docs/RULES_ERRATA.md`. Las tablas salen desordenadas, así que las cifras se reconstruyeron fila a fila y se comprobaron con los ejemplos del propio manual.

## Qué se ha contrastado

| Contenido | Alcance de la comprobación | Resultado |
|---|---|---|
| Armas (24) y alcances de proyectiles | Todas las filas de la tabla de armas y la de alcances (Jugador, p. 42) | Cifras del compendio correctas; **nombres distintos** (Mazo, Báculo, Espada a dos manos, Lanza arrojadiza) y faltan Guantelete y Puño (ya en errata). Alias del compendio conservados |
| Armaduras (6), escudos (3), «Hechizos con armadura» | Todas las filas | Correcto. El maná extra por hechizo (1–6) es independiente de la penalización (0–5) |
| Equipo, comida y transporte | Todas las filas | Precios correctos; **nombres distintos** (Escarpia, Farol, Carromato…) y moneda `mc`. Registrado |
| Talentos (22) | Texto de ambos rangos, clases y requisitos | Correcto salvo Quirurgía (Experto), redactada de forma ambigua (ver errata) y el escudo mediano de Combate con arma y escudo |
| Clases (3) | Atributos, Salud, grupos de armas, niveles 1–5, equipo inicial | Correcto; mago con varita (no «bastón o varita») |
| Trasfondos (7) | Las ocho tablas 2d6 (apóstata y mago del Círculo, una columna por raza), atributos, concentraciones, idiomas, clases | Correcto |
| Hechizos (18) | Escuela, tipo, coste, preparación, NO y tirada de resistencia de los 18; texto completo de Absorción de Maná/Vida, Armadura de Roca, Atontar, Bomba Andante, Brazo Invernal, Debilidad, Descarga Eléctrica, Escudo de Hechizos, Estallido de Llamas, Explosión Mental, Glifo de Parálisis, Maldición de Vulnerabilidad, Puño Pétreo, Sanar, Virote Arcano, Ofensiva Heroica, Voluta de Hechizos | Sin desviaciones |
| Proezas (10 + 6) y reglas de combate | Costes, textos, una vez por asalto, Hostigar, Atravesar armadura (redondeo), Golpe doble (distancias), Desarmar | Correcto con las precisiones ya anotadas |
| Criaturas del bestiario (19) y exclusivas de la aventura (3) | Atributos, concentraciones, Velocidad, Salud, Defensa, Armadura, ataques (bonificación y daño), proezas predilectas, talentos, grupos de armas y equipo de **los 22 bloques**; texto de las aptitudes especiales de todas | Sin desviaciones numéricas. Cazador avvarita: Armadura 3 con malla ligera, tal como se publica |
| PNJ (9) | Bloques de Aldeano furioso, Coalan, Eshara, Tarl Dale y Mythallen; atributos de Hermana Arda, Orellis, Haran y Kesla Mullin y del posadero | El compendio dice que los Mullin no tienen estadísticas: el manual sí las da (errata) |
| Animales y monturas (5) | Caballo de monta y de tiro, mula, halcón, perro | Añadidos desde el Manual del Jugador (el compendio no trae las cifras) |
| Objetos mágicos (15 + Eslabón de la Ira) | Nombres y efectos de los 5 temporales y 10 permanentes | **Nombres y efectos distintos** en varios (Espada de la Víbora, Anillo de protección, etc.): registrados |
| Tablas del DJ | Modificadores al ataque, categorías de peligro, experiencia, tesoros | Correcto; las categorías de tesoro faltaban en el compendio |

## Cómo se comprueba en los tests

- `src/content/content.test.ts`: recuentos (22 talentos, 18 hechizos, 7 trasfondos, 3 clases, 24 armas, 6 armaduras, 3 escudos, 16 proezas, 67 concentraciones, 22 criaturas, 9 PNJ), cifras de las tablas del manual, cobertura 2d6 de cada tabla de trasfondo, referencias cruzadas entre catálogos (proezas, talentos, concentraciones) y valores literales de criaturas.
- `src/rules/rules.test.ts`: fórmulas con los **ejemplos de los propios manuales** (atributos 8, 13, 5, 16, 11, 11, 6, 15; Defensa y Velocidad de la pícara de Kate; daño de Jannelle 10 + 3 − 4 = 9; Virote arcano con malla ligera = 5 PM; Gerhard moribundo 4 asaltos; respiro 9 PS; tirada avanzada 2+5+4+6).
- `tools/content/build-narrative.test.ts`: clasificación de secciones y, si el compendio está disponible, que los archivos generados coinciden con su clasificación.

## Limitaciones conocidas

- Las páginas de `source.page` solo se han anotado cuando se comprobó la página impresa; el resto lleva solo la sección.
- No se han transcrito aún las acciones de vuelo del Manual del Narrador (Fase 5) ni reglas de campañas más allá de la aventura introductoria.
