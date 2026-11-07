# Seguridad y alcance de la llave del DJ

> Estado: documento de diseño (Fase 1). El formato `.dagekey` y la verificación se implementan en la Fase 2.

## Qué hace la llave

Separa la **experiencia** (Modo Jugador / Modo DJ). Una credencial firmada con Ed25519 y ligada al ID de un perfil habilita las rutas del DJ.

## Limitaciones (deben mantenerse visibles para el usuario)

- En una app local **todo el código es modificable** por quien la ejecuta. La llave no protege un secreto.
- **El contenido del DJ se distribuye al cliente**, en un chunk de carga diferida. No se cifra en esta versión.
- Quien copie un perfil copia su llave (la credencial viaja dentro del `.dageprofile`).
- La caducidad depende del reloj del dispositivo.
- No hay revocación remota.
- Los manuales no se incluyen en el repositorio ni en el build. El contenido derivado de los libros no se publica abiertamente: la app se sirve por HTTPS desde un hosting estático privado o sin indexar.

## Custodia de la clave privada

- La clave privada de firma **vive fuera del repositorio**. `.gitignore` excluye `secrets/`, `*.pem` y `*.dagekey.private`.
- Guárdala en un gestor de contraseñas o un volumen cifrado, con copia de seguridad separada.
- La app incluye solo un mapa `keyId → clave pública`, lo que permite rotar claves sin invalidar el formato.
- `tools/keygen` (Fase 2) genera pares de claves y archivos `.dagekey`.

## Pendiente

Revisión final en la Fase 7.
