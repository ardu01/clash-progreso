# Entrega 1.1.5 (base main `325ca27`, 1.1.4)

8 oct 2026. PWA estática en GitHub Pages, sin backend. Los cambios de descarga, alertas y celdas de equipamiento quedan en esta versión. `docs/sistema.md` incluye la especificación (§5.12, §5.13, §7b.2, §7e, §9, §10.25–27). El toast no cambia.

`APP_VERSION` es `1.1.5` y `SHELL_CACHE` es `cp-shell-v9`. `IMAGE_CACHE` sigue en `cp-img-v4`: no cambia ningún PNG ni `assets/`.

## Descarga y redibujado del sheet

En 1.1.4, `downloadAll()` llamaba a `render()` cada 4 imágenes. `render()` sustituye todo `#app`, así que el sheet volvía a subir, el scroll volvía a cero y, en SE a 28 px, «Detener» quedaba cortado. La región `aria-live` del estado también se recreaba y VoiceOver no anunciaba el 25 % de forma fiable. Cambiar de modo en Importar tenía la misma causa.

En 1.1.5:

- `patchOfflineDl()` cambia solo el recuento `N de M`, `--p`, el `aria-label` de la barra y el texto de estado. `render()` queda para el cambio de fase (empezar, detener, terminar, error o sin espacio).
- `render()` marca `#app[data-sheet-keep]` cuando el sheet es el mismo. La regla `#app[data-sheet-keep="true"] .sheet { animation: none; }` evita `sheet-in`.
- El scroll de `.sheet__body` se conserva si la vista es la misma (en Importar: mismo modo, fase y fila). `keepVisible()` desplaza lo justo para que el control con foco se vea entero, anillo incluido.
- El texto visible de la descarga no lleva `aria-live`. `announce()` escribe en `#announcer` (`.sr-only`, `aria-live="polite"`), fuera de `#app`, creado en `boot()`. Anuncia al 25, 50 y 75 % (por bytes) y el estado final: terminado, detenido, error o sin espacio. Lo mismo sirve para que el cambio de modo en Importar no vuelva a subir el sheet.

## Alertas de Ajustes

Hay cuatro alertas y ningún `confirm()` nativo: Restaurar datos incluidos, Borrar todos los datos, Borrar imágenes guardadas y Quitar ….

- Al abrirse, el foco va a Cancelar.
- El `alertdialog` tiene nombre (`aria-labelledby="alert-title"`) y descripción (`aria-describedby="alert-msg"`).
- Todo `#app` salvo `.alert-backdrop` y `.toast` queda `inert`. Tab y Mayús+Tab recorren solo la alerta, en ciclo.
- Esc equivale a Cancelar y no cierra el sheet.
- Al cerrarse, el foco vuelve al control que la abrió; si ya no existe, a su equivalente, luego al control que ocupa su sitio y, por último, al `h2`.

La alerta escala con Dynamic Type: letra en `rem` (17/13 px a tamaño normal) y ancho `min(270 px a 17 px, 100vw − 2 márgenes)`, con `max-height` y scroll si no cabe.

## Equipamiento

`eqCell()`:

- con máximo y sin `overMax`: «…, nivel N de M»;
- con `overMax`: «…, nivel N, máximo desactualizado», el mismo aviso que el chip de la ficha (`overMaxLabel`);
- sin máximo: «…, nivel N».

En los tres casos, «ID deducido» va al final cuando el estado es `id_deducido`. Así el máximo no se comunica solo por el verde de `.eq.is-max`.
