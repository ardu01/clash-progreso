# Entrega 2.1.0

8 oct 2026. PWA estática en GitHub Pages, sin backend y sin login. Parte de main `164704e` (2.0.0).

`APP_VERSION` es `2.1.0`, `SHELL_CACHE` es `cp-shell-v12` e `IMAGE_CACHE` es `cp-img-v5`.

## Qué cambia

- Cada edificio muestra el PNG oficial de su nivel (`imagenes_por_nivel`). Si ese nivel no tiene imagen, se usa el PNG del edificio, sin marca.
- Sin conexión, si la imagen del nivel no está en caché, también se usa ese PNG. Los 8 niveles sin oficial del nivel exacto dicen en la ficha «Imagen del nivel N (no hay oficial del M)».
- La miniatura no estira: `min(1, 96 / max(caja_visible.w, caja_visible.h))`.
- Al instalar se precargan 220 rutas (`precarga === true`). El resto entra en `cp-img-v5` la primera vez que se ve. Los 3 guardianes no tienen imagen de nivel y no se precargan.
- `pesado` sigue siendo más de 3 MB. En este set no hay ninguna.
