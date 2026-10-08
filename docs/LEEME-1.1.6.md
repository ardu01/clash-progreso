# Entrega 1.1.6 (base main `9b5cc61`, 1.1.5)

8 oct 2026. PWA estática en GitHub Pages, sin backend. Esta entrega solo cambia el icono. No hay cambio de lógica.

`APP_VERSION` es `1.1.6` y `SHELL_CACHE` es `cp-shell-v10`. `IMAGE_CACHE` sigue en `cp-img-v4`: no cambia ningún PNG de `assets/` ni del Fan Kit.

## Icono

Miguel eligió la opción B: un castillo en un cartel de madera, con aro verde y marco dorado. Los cuatro archivos de `icons/` se sustituyen por ese arte, en las mismas rutas que ya usan el manifiesto e `index.html`:

- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-maskable-512.png`
- `icons/apple-touch-icon-180.png`

El shell nuevo (`cp-shell-v10`) recoge esos PNG. Las imágenes del juego no se vuelven a precachear.
