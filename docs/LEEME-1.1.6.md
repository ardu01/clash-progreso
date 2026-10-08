# Entrega 1.1.6 (base main `9b5cc61`, 1.1.5)

8 oct 2026. PWA estática en GitHub Pages, sin backend. La marca visible de `overMax` en la rejilla, la higiene de `style=` y el badge `.eq.is-max` opaco quedan en esta versión. `docs/sistema.md` incluye la especificación (§5.12, §7b.2, §8.5, §9, §10.28). El toast no cambia.

`APP_VERSION` es `1.1.6` y `SHELL_CACHE` es `cp-shell-v10`. `IMAGE_CACHE` sigue en `cp-img-v4`: no cambia ningún PNG ni `assets/`.

La base es el squash del PR #7 en main (`9b5cc61`). El árbol es el de `127f449`.

## Equipamiento: `overMax` a la vista

En 1.1.5, `eqCell()` quitaba el verde cuando el nivel superaba el máximo y lo decía solo en el `aria-label`. A la vista, la celda parecía una pieza a medio subir: badge blanco con el nivel y nada más. El aviso visible estaba solo en la ficha, en el chip «Máximo desactualizado».

En 1.1.6 la celda lleva `.eq.is-over`:

- El badge usa los colores de `.chip--warn`, opaco porque pisa la miniatura, y un aro de 1 px en `--orange`: `color-mix(in srgb, var(--orange) 16%, var(--bg-2))`, texto `--orange-text`.
- Debajo de la miniatura, `.eq__cap--warn` dice «máx. M» (el máximo de caps que se ha quedado viejo). «18» en el badge y «máx. 15» debajo dicen en texto que el nivel supera el máximo. No se calcula ni se inventa ningún máximo.
- Con `id_deducido` van las dos etiquetas, «máx. M» y debajo «ID deducido», en el mismo orden que el `aria-label`.
- El `aria-label` no cambia: «…, nivel N, máximo desactualizado».
- No es el verde de `.is-max` y no lleva esa clase.

Las filas de detalle, héroes, mascotas y muros ya enseñan el máximo a la vista (`Nv N / M` o «Máx TH18»). No se tocan.

## O1: badge `.eq.is-max` opaco

`.eq.is-max .eq__lvl` usaba `--green-soft`, translúcido (`rgba` 0,16 en claro y 0,20 en oscuro). §7b.2 ya pedía `color-mix(in srgb, var(--green) 16%, var(--bg-2))`, opaco porque pisa la miniatura. El fondo pasa a esa mezcla. El texto y el aro verde no cambian.

## Higiene: `style=` fijos a clases

35 atributos `style=` fijos de `js/app.js` pasan a utilidades al final de `css/views.css` (`.u-center`, `.u-mt2`, `.row__pct`, `.row--tall`, `.inset-head`, `.sk--96`, …), con tokens `--sp-*` donde el valor coincide. El `gap: 6px` de `.u-wrap6` no tiene token y se queda en 6 px. Quedan 9 `style=`, todos con datos (`--size`, `--cx`, `--cy`, `--z`, `--p`, `--n`, `--k`).

## Texto

- §7b.2 y el ejemplo de §9 describen el `aria-label` de la celda en lista, sin comillas anidadas: el nombre y «ID deducido» también van en el caso `overMax`. El código ya lo hacía.
- §5.12 dice que la alerta lleva `max-height: calc(100dvh − 2 márgenes)` y `overflow: auto`.
- Fe de erratas: `LEEME-1.1.5.md` atribuía a `announce()` el arreglo del cambio de modo en Importar; es `data-sheet-keep`.

## Docs y tests

- `docs/sistema.md`: §5.12, §7b.2, §8.5, §9, §10.28 y la nota de 1.1.6.
- `node --test test/`: 54 en verde (51 de 1.1.5, 2 de la marca `overMax` y el de O1).
