# Clash Progreso: sistema visual iOS (v1)

> Documento de diseño para la PWA `ardu01/clash-progreso`: sin backend, sin login, GitHub Pages, offline y pensada para usarse instalada en Safari de iPhone. Toda la interfaz va en español.
> Autor: Clash PWA Diseño · 7 oct 2026 · Los valores son exactos y el CSS se puede pegar tal cual. Requisito mínimo: iOS 16.4 (`color-mix`, `:has`, `dvh`).
> Fuentes de datos revisadas (solo lectura): `/workspace/coc/*_2026-10-07.json`, `historico/exportaciones/`, `historico/snapshots.csv`, `analyze.py`, `map.py`, `caps_clashrecord.json` y `assets/oficial/` (manifest.csv, manifest_detalle.csv, manifest_edificios.csv).
> **Niveles máximos: solo `caps_clashrecord.json`.** `coc.py` (`static_data.json`) y `map.py` sirven únicamente para identificar IDs, nunca como fuente de máximos. Imágenes y estados: `/workspace/clash-pwa-imagenes/v1/manifest.json` (v1 congelada) y, desde la v1.1, el `manifest.json` principal.

---

## 0. Estructura de archivos CSS propuesta

El repo solo contiene `README.md` (rama `main`), así que no hay CSS previo con el que alinearse. Propongo esta estructura (el líder decide):

```
css/tokens.css      → §2 y §4 (solo custom properties)
css/base.css        → reset, tipografía, layout de pantalla, safe areas (§3, §5.1, §6)
css/components.css  → tarjeta, lista, barra, chip, botón, segmented, thumb, toast, sheet, tabbar (§5, §6)
css/views.css       → ajustes propios de cada vista (§7, §8)
```

Las rutas son hash para que funcione en GitHub Pages sin configurar nada: `#/roster`, `#/progreso`, `#/progreso/<tag>/<categoria>`, `#/mejoras`, `#/evolucion` e `#/importar` (sheet). Todas las rutas de assets son **relativas** (`./img/...`) porque la app vive en `/clash-progreso/`.

---

## 1. Principios

1. **Nativa iOS, no "temática Clash".** Se usan colores de sistema, SF Pro, listas *inset grouped*, Large Title y tab bar translúcida, como manda la Apple HIG. El color del juego lo ponen las imágenes oficiales del Fan Kit, no la interfaz: nada de texturas, madera ni fuentes "de juego".
2. **Una mano.** Lo que se toca a menudo queda en el tercio inferior: tab bar, filas y botón primario del sheet. Arriba solo hay lectura. Ningún gesto es imprescindible porque todo tiene botón.
3. **Legible al sol.** Todo el texto cumple AA (4,5:1) en claro y en oscuro. Por eso los grises y el azul van un punto más oscuros que los de iOS (ver §2). Los números importantes usan peso ≥ 600 y cifras tabulares.
4. **El dato manda.** Cada barra lleva siempre su porcentaje en texto y nunca se transmite información solo con color.
5. **Sin alarmismo.** El rojo queda reservado a errores. Un progreso bajo **nunca** se pinta en rojo, y menos los héroes de C1 (Miguel los sube con pociones): ni ocupan el primer puesto ni se marcan como cuello de botella.
6. **Imágenes oficiales sin tocar.** Los PNG del Fan Kit no se recortan, ni se recolorean, ni se cambian. La caja cuadrada la pone el CSS. Cuando falta una imagen se muestra una caja tipográfica neutra, sin emojis, sin iconos genéricos y sin imágenes de otras webs (nunca de `assets/wiki/`).

---

## 2. Tokens de color

Los valores parten de los colores de sistema de iOS. Hay cambios **deliberados** para cumplir AA (ratios medidos con la fórmula WCAG):

| Token | iOS original | Aquí | Motivo |
|---|---|---|---|
| `--label-2` (claro) | rgba(60,60,67,.6) ≈ #8A8A8E (3,4:1) | **#6C6C70** (5,2:1 sobre blanco, 4,7:1 sobre #F2F2F7) | Footnotes legibles al sol |
| `--tint` (claro) | #007AFF (4,0:1) | **#0066CC** (5,6:1 sobre blanco y blanco sobre él) | Enlaces y botones AA |
| `--tint` (oscuro) | #0A84FF | **#409CFF** como texto (6,0:1 sobre #1C1C1E); relleno de botón **#0A6CD9** (blanco 5,1:1) | Blanco sobre #0A84FF da solo 3,6:1 |
| `--green-text` (claro) | #248A3D (4,4:1) | **#1F7A35** (5,4:1) | Estado "Máx" |
| `--label-3` | rgba(60,60,67,.3) | #8A8A8E / #8E8E93 | **Nunca para texto informativo**: solo chevrons, placeholder de inputs y decoración |

```css
/* css/tokens.css */
:root {
  color-scheme: light dark;

  /* Fondos (agrupados) */
  --bg:            #F2F2F7;   /* systemGroupedBackground */
  --bg-2:          #FFFFFF;   /* secondarySystemGroupedBackground: tarjetas y filas */
  --bg-3:          #F2F2F7;   /* tertiary: elementos dentro de tarjeta */
  --bg-elevated:   #FFFFFF;   /* sheets, alertas */

  /* Texto */
  --label:         #000000;
  --label-2:       #6C6C70;
  --label-3:       #8A8A8E;   /* solo no-texto (ver tabla) */
  --label-inverse: #FFFFFF;

  /* Separadores y rellenos */
  --separator:        rgba(60, 60, 67, 0.29);
  --separator-opaque: #C6C6C8;
  --fill-1: rgba(120, 120, 128, 0.20);
  --fill-2: rgba(120, 120, 128, 0.16);
  --fill-3: rgba(118, 118, 128, 0.12);   /* track de barras, segmented, chips */
  --fill-4: rgba(116, 116, 128, 0.08);   /* skeleton, highlight de fila */

  /* Acento */
  --tint:       #0066CC;
  --tint-fill:  #0066CC;
  --on-tint:    #FFFFFF;
  --tint-soft:  rgba(0, 102, 204, 0.12);  /* botón secundario, chip "Principal" */

  /* Estado: relleno (barras, puntos) y texto (AA) */
  --green:       #34C759;  --green-text:  #1F7A35;
  --orange:      #FF9500;  --orange-text: #C93400;
  --red:         #FF3B30;  --red-text:    #D70015;  /* solo errores */
  --green-soft:  rgba(52, 199, 89, 0.16);

  /* Categorías de progreso (nombres = analyze.py / snapshots.csv) */
  --cat-defensas:     #5856D6;  /* indigo */
  --cat-laboratorio:  #AF52DE;  /* purple: tropas, hechizos, asedios */
  --cat-ejercito:     #30B0C7;  /* teal: edificios de ejército */
  --cat-equipamiento: #FF2D55;  /* pink */
  --cat-mascotas:     #00C7BE;  /* mint */
  --cat-heroes:       #32ADE6;  /* cyan: tono tranquilo a propósito */
  --cat-trampas:      #A2845E;  /* brown */
  --cat-recursos:     #FFCC00;  /* yellow */
  --cat-muros:        #6E7A8A;  /* slate */

  /* Miniaturas */
  --thumb-bg: #EFEFF4;

  /* Materiales */
  --material-bar:         rgba(249, 249, 249, 0.80);
  --material-bar-solid:   #F9F9F9;
  --material-float:       rgba(255, 255, 255, 0.86);
  --material-float-solid: #FFFFFF;
  --bar-hairline:         rgba(0, 0, 0, 0.30);
  --seg-thumb:            #FFFFFF;
  --shadow-float: 0 8px 24px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-thumb: 0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg:            #000000;
    --bg-2:          #1C1C1E;
    --bg-3:          #2C2C2E;
    --bg-elevated:   #1C1C1E;

    --label:         #FFFFFF;
    --label-2:       #AEAEB2;   /* 7,7:1 sobre #1C1C1E */
    --label-3:       #8E8E93;
    --label-inverse: #000000;

    --separator:        rgba(84, 84, 88, 0.65);
    --separator-opaque: #38383A;
    --fill-1: rgba(120, 120, 128, 0.36);
    --fill-2: rgba(120, 120, 128, 0.32);
    --fill-3: rgba(118, 118, 128, 0.24);
    --fill-4: rgba(118, 118, 128, 0.18);

    --tint:       #409CFF;
    --tint-fill:  #0A6CD9;
    --on-tint:    #FFFFFF;
    --tint-soft:  rgba(64, 156, 255, 0.18);

    --green:       #30D158;  --green-text:  #30D158;
    --orange:      #FF9F0A;  --orange-text: #FF9F0A;
    --red:         #FF453A;  --red-text:    #FF6961;
    --green-soft:  rgba(48, 209, 88, 0.20);

    --cat-defensas:     #5E5CE6;
    --cat-laboratorio:  #BF5AF2;
    --cat-ejercito:     #40C8E0;
    --cat-equipamiento: #FF375F;
    --cat-mascotas:     #63E6E2;
    --cat-heroes:       #64D2FF;
    --cat-trampas:      #AC8E68;
    --cat-recursos:     #FFD60A;
    --cat-muros:        #8E9AAB;

    --thumb-bg: #2C2C2E;

    --material-bar:         rgba(30, 30, 30, 0.80);
    --material-bar-solid:   #1E1E1E;
    --material-float:       rgba(44, 44, 46, 0.86);
    --material-float-solid: #2C2C2E;
    --bar-hairline:         rgba(255, 255, 255, 0.15);
    --seg-thumb:            #636366;
    --shadow-float: 0 8px 24px rgba(0, 0, 0, 0.5);
    --shadow-thumb: 0 3px 8px rgba(0, 0, 0, 0.4);
  }
}
```

**Asignación de categorías.** La clase `.cat-<clave>` define `--cat` y la usan los componentes. Las claves son las de `snapshots.csv` (`pct_<clave>`), con `ejercito_edif` acortado a `ejercito`:

```css
.cat-defensas     { --cat: var(--cat-defensas); }
.cat-laboratorio  { --cat: var(--cat-laboratorio); }
.cat-ejercito     { --cat: var(--cat-ejercito); }
.cat-equipamiento { --cat: var(--cat-equipamiento); }
.cat-mascotas     { --cat: var(--cat-mascotas); }
.cat-heroes       { --cat: var(--cat-heroes); }
.cat-trampas      { --cat: var(--cat-trampas); }
.cat-recursos     { --cat: var(--cat-recursos); }
.cat-muros        { --cat: var(--cat-muros); }
```

**Orden fijo de categorías** (igual en todas las cuentas y nunca ordenado por "peor %"):

| # | Etiqueta en la UI | Columna CSV | Categoría en `analyze.py` |
|---|---|---|---|
| 1 | Defensas | `pct_defensas` / `pct_sig_defensas` | Defensas (incluye guardianes y crafteadas) |
| 2 | Laboratorio | `pct_laboratorio` | Laboratorio (tropas/hechizos/asedios) |
| 3 | Ejército (edificios) | `pct_ejercito_edif` | Edificios de ejército |
| 4 | Equipamiento | `pct_equipamiento` | Equipamiento |
| 5 | Mascotas | `pct_mascotas` | Mascotas |
| 6 | **Héroes** | `pct_heroes` | Héroes |
| 7 | Trampas | `pct_trampas` | Trampas |
| 8 | Recursos | `pct_recursos` | Recursos |
| 9 | Muros | `pct_muros` | Muros |

"Ayudantes" y "Otros" de `analyze.py` no se muestran. Héroes va en 6.º lugar en **todas** las cuentas, así que en C1 nunca aparece arriba.

---

## 3. Tipografía

La escala sigue a **Dynamic Type**: `html` toma el tamaño de `-apple-system-body` (17 px por defecto, cambia con Ajustes → Pantalla y brillo → Tamaño del texto) y todos los estilos van en `rem` relativos a 17. El *chrome* (tab bar, nav compacta, segmented) va en px fijos, como en iOS.

```css
/* css/base.css */
html {
  font-size: 106.25%;                     /* 17px fallback */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
@supports (font: -apple-system-body) {
  html { font: -apple-system-body; }      /* Dynamic Type en iOS */
}
:root {
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
          "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
body {
  margin: 0;
  font-family: var(--font);
  font-size: 1rem;
  line-height: 1.2941;                    /* 22/17 */
  letter-spacing: -0.024em;               /* -0.41pt */
  color: var(--label);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
```

| Estilo | Clase | Tamaño (rem / px a 17) | Line-height | Peso | Tracking |
|---|---|---|---|---|---|
| Large Title | `.t-large` | 2rem / 34 | 41/34 = 1.206 | 700 | 0.011em (+0.37) |
| Title 1 | `.t-title1` | 1.647rem / 28 | 34/28 = 1.214 | 700 | 0.013em (+0.36) |
| Title 2 | `.t-title2` | 1.294rem / 22 | 28/22 = 1.273 | 700 | 0.016em (+0.35) |
| Title 3 | `.t-title3` | 1.176rem / 20 | 25/20 = 1.25 | 600 | 0.019em (+0.38) |
| Headline | `.t-headline` | 1rem / 17 | 1.294 | 600 | -0.024em (-0.41) |
| Body | `.t-body` | 1rem / 17 | 1.294 | 400 | -0.024em (-0.41) |
| Callout | `.t-callout` | 0.941rem / 16 | 21/16 = 1.3125 | 400 | -0.02em (-0.32) |
| Subheadline | `.t-subhead` | 0.882rem / 15 | 20/15 = 1.333 | 400 | -0.016em (-0.24) |
| Footnote | `.t-footnote` | 0.765rem / 13 | 18/13 = 1.385 | 400 | -0.006em (-0.08) |
| Caption 1 | `.t-caption1` | 0.706rem / 12 | 16/12 = 1.333 | 400 | 0 |
| Caption 2 | `.t-caption2` | 0.647rem / 11 | 13/11 = 1.182 | 400 | 0.006em (+0.07) |

```css
.t-large    { font-size: 2rem;     line-height: 1.206;  font-weight: 700; letter-spacing: 0.011em; }
.t-title1   { font-size: 1.647rem; line-height: 1.214;  font-weight: 700; letter-spacing: 0.013em; }
.t-title2   { font-size: 1.294rem; line-height: 1.273;  font-weight: 700; letter-spacing: 0.016em; }
.t-title3   { font-size: 1.176rem; line-height: 1.25;   font-weight: 600; letter-spacing: 0.019em; }
.t-headline { font-size: 1rem;     line-height: 1.294;  font-weight: 600; letter-spacing: -0.024em; }
.t-body     { font-size: 1rem;     line-height: 1.294;  font-weight: 400; letter-spacing: -0.024em; }
.t-callout  { font-size: 0.941rem; line-height: 1.3125; font-weight: 400; letter-spacing: -0.02em; }
.t-subhead  { font-size: 0.882rem; line-height: 1.333;  font-weight: 400; letter-spacing: -0.016em; }
.t-footnote { font-size: 0.765rem; line-height: 1.385;  font-weight: 400; letter-spacing: -0.006em; }
.t-caption1 { font-size: 0.706rem; line-height: 1.333;  font-weight: 400; letter-spacing: 0; }
.t-caption2 { font-size: 0.647rem; line-height: 1.182;  font-weight: 400; letter-spacing: 0.006em; }

.c-2  { color: var(--label-2); }
.w-6  { font-weight: 600; }
.num  { font-variant-numeric: tabular-nums; }         /* %, niveles, contadores, horas */
.tag  { font-family: var(--font-mono); font-size: 0.94em; letter-spacing: 0; }   /* #28PLGP0G2 */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
```

**Formato de números y fechas** (siempre `es-ES`, siempre hora de Madrid):
- Porcentaje con 1 decimal, coma y espacio duro: `70,1 %`.
- Niveles: `Nv 11 → 12` (U+2192). Si `lvl` es 0 con timer, el texto es **`Nuevo`** (§7c). Niveles frente a máximo: `Nv 15 / 17`.
- Fechas: `jue 08/10 12:48` (24 h, sin "h"). Relativas: `en 3 d 4 h`, `en 14 h 25 min`, `en 42 min`, `en < 1 min`.

```js
const fmtPct = n => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n) + '\u00A0%';
const fmtFin = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', weekday: 'short', day: '2-digit',
  month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
});
// fin de una mejora: fmtFin.format(new Date((exp.timestamp + item.timer) * 1000)).replace(/,/g, "").replace(/ /g, "\u00a0")  → espacios de no separación, «jue 08/10 12:48» no se parte
```

---

## 4. Espaciado, márgenes, radios y materiales

```css
:root {
  /* Escala 4/8 */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px; --sp-12: 48px;

  /* Márgenes de pantalla: 16 en iPhone estándar, 20 en Plus/Max (≥ 414 px) */
  --margin: 16px;
  --margin-l: max(var(--margin), env(safe-area-inset-left));
  --margin-r: max(var(--margin), env(safe-area-inset-right));

  /* Radios */
  --r-card:  12px;   /* tarjetas y grupos inset */
  --r-btn:   12px;   /* botones grandes (50 px alto) */
  --r-sheet: 14px;   /* sheet y alerta */
  --r-seg:    9px;   /* segmented: track */
  --r-seg-thumb: 7px;
  --r-pill: 999px;   /* chips, badges, barras */
  /* miniaturas: 22,5 % del lado (ver §5.4) */

  /* Alturas */
  --row-min: 44px;   /* fila mínima = objetivo táctil */
  --tabbar-h: 49px;
  --navbar-h: 44px;
}
@media (min-width: 414px) { :root { --margin: 20px; } }
```

**Materiales translúcidos** (tab bar, nav bar colapsada, toast, alerta). Si no hay `backdrop-filter`, el fallback es sólido:

```css
.material-bar { background: var(--material-bar-solid); }
.material-float { background: var(--material-float-solid); box-shadow: var(--shadow-float); }
@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .material-bar {
    background: var(--material-bar);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
            backdrop-filter: saturate(180%) blur(20px);
  }
  .material-float {
    background: var(--material-float);
    -webkit-backdrop-filter: saturate(180%) blur(30px);
            backdrop-filter: saturate(180%) blur(30px);
  }
}
```

Sombras: las tarjetas y filas **no** llevan sombra (estilo iOS agrupado: el contraste de fondo #F2F2F7 / #FFFFFF basta). Solo flotan, con sombra, el toast, la alerta, el callout de gráficos y el thumb del segmented control.

---

## 5. Componentes

### 5.1 Layout de pantalla

```css
*, *::before, *::after { box-sizing: border-box; }
.screen {
  min-height: 100dvh;
  padding-top: calc(env(safe-area-inset-top) + var(--navbar-h));
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--sp-6));
}
.section { margin: 0 var(--margin-r) var(--sp-8) var(--margin-l); }
.section-header {                         /* cabecera de grupo */
  display: flex; justify-content: space-between; align-items: baseline;
  margin: 0 var(--sp-4) var(--sp-2);
  font-size: 0.765rem; line-height: 1.385; color: var(--label-2);
  text-transform: uppercase; letter-spacing: 0.02em;
}
.section-header .num { text-transform: none; letter-spacing: 0; }   /* contador a la derecha: "43 piezas" */
.section-footer { margin: var(--sp-2) var(--sp-4) 0; font-size: 0.765rem; line-height: 1.385; color: var(--label-2); }
.screen > .section:first-child { margin-top: var(--sp-4); }   /* pantallas push sin Large Title (detalle de categoría): 16 px bajo la nav */
```

Las vistas raíz empiezan por `h1.large-title`, así que la última regla solo actúa en las pantallas push (`#/progreso/<tag>/<cat>`), cuya primera `.section` quedaba pegada a la nav compacta.

### 5.2 Tarjeta

```css
.card {
  background: var(--bg-2);
  border-radius: var(--r-card);
  padding: var(--sp-4);
  overflow: hidden;
}
.card + .card { margin-top: var(--sp-2); }
.card--tap { display: block; color: inherit; text-decoration: none; }
.card--tap:active { background: color-mix(in srgb, var(--bg-2), var(--label) 6%); }  /* highlight iOS, sin escala */
.card__top { display: flex; justify-content: space-between; align-items: baseline; gap: var(--sp-2); }  /* título + contador/valor a la derecha */
```

### 5.3 Lista agrupada (inset grouped)

```css
.list { background: var(--bg-2); border-radius: var(--r-card); overflow: hidden; padding: 0; margin: 0; list-style: none; }
.row {
  position: relative;
  display: flex; align-items: center; gap: var(--sp-3);
  min-height: var(--row-min);
  padding: var(--sp-2) var(--sp-4);
  color: inherit; text-decoration: none;
}
a.row:active, button.row:active { background: color-mix(in srgb, var(--bg-2), var(--label) 6%); }
.row + .row::before,
li + li > .row::before {                   /* separador que arranca donde empieza el texto; también si cada fila va en su <li> (1.1.1) */
  content: ""; position: absolute; top: 0; right: 0;
  left: var(--row-inset, var(--sp-4));
  height: 0.5px; background: var(--separator);
}
.row--thumb44 { --row-inset: calc(var(--sp-4) + 44px + var(--sp-3)); min-height: 64px; }
.row--thumb40 { --row-inset: calc(var(--sp-4) + 40px + var(--sp-3)); min-height: 60px; }
.row__main  { flex: 1; min-width: 0; display: flex; flex-direction: column; } /* título y subtítulo siempre en dos líneas, aunque sean <span> */
.row__title { font-size: 1rem; line-height: 1.294; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Título con insignia o recuento (1.1.4): se recorta solo el nombre */
.row__title--meta { display: flex; align-items: baseline; }
.row__title--meta > .row__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row__title--meta > .num, .row__title--meta > .badge { flex: none; }
.row__title--meta > .num { margin-left: 0.25em; }
.row__sub   { font-size: 0.765rem; line-height: 1.385; color: var(--label-2); }
.row--account .row__sub { overflow-wrap: break-word; }   /* lote: un nombre de archivo largo sin espacios baja de línea en vez de cortarse (1.1.3) */
.row__trail { display: flex; align-items: center; gap: var(--sp-2); color: var(--label-2); font-variant-numeric: tabular-nums; text-align: right; }
.row__trail--stack { flex: none; flex-direction: column; align-items: flex-end; gap: 0; }   /* restante + hora de fin (§7c); flex: none solo a tamaño normal, a 19em lo anula el bloque de Dynamic Type */
.row__trail--stack > :first-child { color: var(--label); }                    /* el restante va en --label; la hora sigue en --label-2 */
button.row { width: 100%; border: 0; background: none; font: inherit; letter-spacing: inherit; color: inherit; text-align: left; cursor: pointer; }
.row.row--destructive { color: var(--red-text); }                             /* "Borrar todos los datos" (gana a button.row) */
.chevron    { width: 8px; height: 13px; flex: none; color: var(--label-3); }
```

**Dynamic Type en filas.** La `.list` es contenedor (`container-type: inline-size`, como `.sheet__body` en §8.6). Con `19em` de ancho o menos (cuerpo de unos 19 px o más en 390 px: 358 px / 19 px = 18,8em) las filas con trailing ancho pasan a dos líneas: texto arriba y trailing debajo, alineado con el texto. Los títulos de **todas** las filas de lista (`.row__title`: detalle de categoría, Héroes, Mascotas, Laboratorio, Categorías, Ajustes…) dejan de recortarse y bajan de línea con `overflow-wrap: break-word` (solo se parte una palabra si no cabe sola). Las insignias `.badge` y `.badge-id` son `inline-block` + `nowrap`: bajan enteras a la línea siguiente, así que «ID deducido» y el ID de los «Sin identificar» se ven siempre. La miniatura, la barra mini y el trailing siguen centrados en vertical (`align-items: center` de `.row`) y alineados a la derecha. A tamaño normal (17 px, 21,1em) no cambia nada. Clases que pone el JS: `.row--account` en las filas TH13/TH11 del Roster (§7a) y en todas las filas del lote de Importar (§8.4: el tag o alias no se recorta y el trailing `+3 niveles` / `Sin cambios` / `Duplicada`… baja a su propia línea, alineado con el texto; desde 1.1.1; su subtítulo lleva `overflow-wrap: break-word` a cualquier tamaño, para que un nombre de archivo largo sin espacios baje de línea en vez de cortarse, 1.1.3), y `.row--upgrade` en las filas de mejora y de ayudante (§7c). A tamaño normal, en las filas con insignia o `×N`, el título es `.row__title--meta`: el «…» recorta solo `.row__name`, y «ID deducido», el ID y `×N` se ven siempre (1.1.4).

```css
.list { container-type: inline-size; }
@container (max-width: 19em) {
  /* Todas las filas: el título baja de línea en vez de recortarse (va antes que .row--account, que conserva anywhere) */
  .row .row__title { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: break-word; }
  .row .row__title--meta { display: block; }
  .row .row__title--meta > .row__name { white-space: normal; overflow: visible; }

  /* Roster (§7a): el tag nunca se recorta; barra, % y chevron bajan a una segunda línea */
  .row--account { flex-wrap: wrap; row-gap: var(--sp-1); padding-top: var(--sp-3); padding-bottom: var(--sp-3); }
  .row--account > .row__main { flex: 1 1 0; }
  .row--account .row__title { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; }
  .row--account > .row__trail { flex: 1 0 100%; flex-wrap: nowrap; justify-content: flex-start; }
  .row--account > .thumb ~ .row__trail { padding-left: calc(44px + var(--sp-3)); }   /* alineado con el texto */
  .row--account > .row__trail .bar { flex: 1 1 auto; width: auto; }                  /* la barra mini ocupa el ancho libre */

  /* Mejoras y ayudantes (§7c): restante + hora bajan bajo el título, a la izquierda; títulos en varias líneas */
  .row--upgrade { flex-wrap: wrap; row-gap: 2px; }
  .row--upgrade > .row__main { flex: 1 1 0; }
  .row--upgrade .row__title { white-space: normal; overflow: visible; text-overflow: clip; }
  .row--upgrade > .row__trail--stack {
    flex: 1 0 100%;                                     /* anula el flex: none de tamaño normal */
    flex-direction: row; flex-wrap: wrap; align-items: baseline; column-gap: var(--sp-2);
    justify-content: flex-start; text-align: left;
  }
  .row--upgrade > .thumb ~ .row__trail--stack { padding-left: calc(40px + var(--sp-3)); }  /* alineado con el título */
}
```

- `container-type` aplica contención de layout: `.list` pasa a ser bloque contenedor de los descendientes `position: absolute`/`fixed`. Dentro de una lista no hay ninguno (los separadores `::before` cuelgan de `.row`, que es `relative`).
- El `padding-left` va con el combinador `~` para que una fila sin miniatura no deje el hueco.

Los separadores aparecen entre `.row` hermanas (`a.row`, `button.row`, `div.row` o `li.row` directamente dentro de `.list`) y, desde 1.1.1, también cuando cada fila va envuelta en su `<li>` (`ul.list > li > a.row`, selector `li + li > .row::before`). Antes de 1.1.1 las listas con `li > .row` salían sin separadores. Dentro de un mismo `<li>` no se ponen dos `.row`.

Chevron (SVG de UI, no es un ítem del juego): `<svg class="chevron" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`

### 5.4 Miniatura de imagen oficial (`.thumb`) y estados del manifiesto

**Fuente de verdad**: `/workspace/clash-pwa-imagenes/manifest.json` (schema 1). La consulta es siempre `manifest.items[String(entry.data)]`. Para el Ayuntamiento (1000001) es `items["1000001"].imagenes_por_nivel[String(lvl)]` (TH 11–18), que es la **imagen principal de cada cuenta** en Roster, el selector y la vista previa de importación. El nombre visible sale de `nombre_es ?? nombre_en` (algunas defensas solo traen `nombre_en`, p. ej. Mortar).

Los PNG llegan **byte a byte del Fan Kit**: 130 archivos (~41 MB), de 80×119 a 1200×1080 px, con tres `tipo_visual`. No se editan. La caja cuadrada es CSS y la imagen entra con `object-fit: contain`, sin recortar ni recolorear.

| Tamaño | Clase | Uso |
|---|---|---|
| 22 px | dentro de `.chip--account` | chips de cuenta |
| 40 px | `.thumb--40` | filas de ítem (detalle de categoría, mejoras, héroes) |
| 44 px | `.thumb--44` | filas de cuenta (roster TH13/TH11, selector) |
| 52 px | `.thumb--52` | rejilla de equipamiento (§7b.2) |
| 72 px | `.thumb--72` | tarjetas C1 y C2 |
| 96 px | `.thumb--96` | vista previa de importación, ficha de ítem |

```css
.thumb {
  --size: 44px;
  position: relative;
  width: var(--size); height: var(--size);
  flex: none;
  padding: calc(var(--size) * 0.08);        /* 3,5 px a 44: el PNG nunca toca el borde */
  border-radius: calc(var(--size) * 0.225); /* 10 px a 44, 16 px a 72 */
  background: var(--thumb-bg);
  display: grid; place-items: center;
  grid-template: 100% / 100%;               /* fila y columna fijas: un PNG vertical (Hidden Tesla 80×119) no estira la fila ni se corta por abajo */
  overflow: hidden;
}
.thumb > img {
  width: 100%; height: 100%;
  object-fit: contain; object-position: 50% 50%;
  display: block;
}
.thumb--40 { --size: 40px; }  .thumb--44 { --size: 44px; }  .thumb--52 { --size: 52px; }
.thumb--72 { --size: 72px; }  .thumb--96 { --size: 96px; }

/* tipo_visual = tile_fondo_opaco (14: casi todos los hechizos, Yeti, Titán Eléctrico, Gólem):
   el PNG ya es un cuadrado con fondo y esquinas propias → sin caja ni padding y sin recorte */
.thumb--tile { background: transparent; padding: 0; overflow: visible; }
/* recorte_sobre_transparente (106) y retrato_cortado_en_borde (10): estilo base */
```

**Encuadre de PNG con mucho margen transparente (`caja_visible`, v1.2).** El manifiesto da para cada imagen el lienzo (`ancho`, `alto`) y `caja_visible` `{x, y, w, h}` con la zona que ocupa el dibujo. El archivo no se recorta: se amplía con CSS dentro de la caja. La app calcula tres variables por imagen, normalizando la caja a 1 (con `k = 1 / max(ancho, alto)`):

- `cx = (1 − ancho·k)/2 + (x + w/2)·k` y `cy = (1 − alto·k)/2 + (y + h/2)·k` son el centro del dibujo dentro de la caja.
- `z = min(0.92 / max(w·k, h·k), max(ancho, alto) / (lado · 3), 8)` es el zoom para que el dibujo ocupe el 92 %. `lado` es el interior de la caja en px CSS (`--size · 0.84`, 43,7 px a 52). El segundo término impide ampliar por encima de la resolución del PNG a DPR 3, así que nunca se ve borroso. El tope es ×8.
- Solo se aplica si `z ≥ 1.15`. Si no, se deja el estilo base. Si falta `caja_visible`, también estilo base.

```css
.thumb--encuadre > img {
  transform-origin: calc(var(--cx) * 100%) calc(var(--cy) * 100%);
  transform: translate(calc((0.5 - var(--cx)) * 100%), calc((0.5 - var(--cy)) * 100%)) scale(var(--z));
}
```

```html
<span class="thumb thumb--52 thumb--encuadre" style="--cx:.5;--cy:.52;--z:2.6"><img src="…/laboratory.png" width="52" height="52" alt="Laboratorio" loading="lazy" decoding="async"></span>
```

El `overflow: hidden` de `.thumb` recorta lo ampliado solo en pantalla. Con la v1.2 real (184 imágenes) se aplica a 39. Por ejemplo, Muro sale a ×7,8, Choza de constructor a ×4,2 y Mortero a ×4,1, mientras que Bomba (lienzo de 131 px) se queda en ×1 por resolución. El Laboratorio ocupa el 73 % y no lo necesita. No se usa en `.thumb--tile`.

**Los cuatro estados del manifiesto** (más dos de carga). La app lee **siempre** `estado` del manifiesto: no hay listas fijas de IDs en el código. Pasar de v1 a v1.1 solo cambia el manifiesto.

| Estado | Miniatura | Badge (junto al nombre) | Nombre | ¿Cuenta en %? |
|---|---|---|---|---|
| `ok` (122) | imagen | ninguno | `nombre_es ?? nombre_en` | sí |
| `id_deducido` (v1: 1, el Duque Dragón 28000007; v1.1: 4, el Duque Dragón más Fire Heart 90000052, Rocket Backpack 90000053 y Electro Fangs 90000059) | imagen (o iniciales si no tiene) | **`ID deducido`** (`.badge.badge--soft`) | `nombre_es ?? nombre_en` (con `nombre_pendiente`, `nombre_en`; §7b.1, Logger) | sí, con la nota "ID deducido por descarte" en la ficha |
| `faltante` (55: defensas sin asset, muros, 18 edificios, ayudantes, guardianes, aldea del constructor…) | `.thumb--empty` con **iniciales** | ninguno en listas; `Sin imagen oficial` en la ficha | nombre | sí |
| `sin_identificar` (v1: 25, con 8 equipamientos, módulos/tipos crafteados, 1 tropa, 1 asedio, 1 hechizo, 1 ayudante y 1 guardián; v1.1: 22, con 5 equipamientos) | `.thumb--unknown` con **"?"** | en listas solo `ID 90000016` (`.badge.badge-id`), porque el título ya dice "Sin identificar"; en la ficha, además `sin identificar` (`.badge`) | "Sin identificar" en cursiva | **no**, salvo que `caps_clashrecord.json` tenga tope para ese ID en el TH de la cuenta (ver «Qué cuenta en el %», abajo). Los `crafting_module` suman en Defensas vía `craftedScore` |
| cargando (online) | `--thumb-bg` liso, imagen invisible hasta `load` | — | — | — |
| no está en caché y no hay conexión | `.thumb--offline`: rayado diagonal, sin texto | — | — | — |

**Qué cuenta en el % (regla única; decisión del equipo, 8 oct 2026).** El `estado` del manifiesto decide la miniatura, el badge y el nombre, **nunca** si un ítem cuenta. Cuenta en el % el ítem que tiene tope en `caps_clashrecord.json` para el TH de la cuenta, buscado por ID (ID → `ALIAS` de `js/progress.js` → `items[id].nombre_en` → `caps[TH][clave]`, §7b.1 y nota del PR #2), y entonces lleva barra y `Nv N / máx`. Es lo que ya hace `summarize()`/`analyze()` en 1.1.1. Por eso un ítem `sin_identificar` con tope sí cuenta (hoy 107000008 en C1, `Nv 1 / 5`, vía `ALIAS` `Guardian-Logger`). La única excepción son los módulos del taller (`categoria === "crafting_module"`, 102000033–102000041): no tienen tope propio, pero suman en Defensas a través de `craftedScore`. Matices que no cambian: en Equipamiento no cuentan las piezas en nivel 1 (§7b.2) y los «Disponible en THn» no tienen tope en el TH actual. **Todo aviso «N ítems sin identificar»** (detalle de categoría §7b.1, vista previa §8.4) cuenta los ítems que se muestran con **"?"** (desconocidos) **y** no tienen tope tras `ALIAS` (sin contar los `crafting_module`), nunca por el `estado`, así que el aviso y el % no pueden contradecirse. Los ítems conocidos sin clave en caps (Ayuntamiento, Estación de crafteo, Cabaña de B.O.B) no entran en el aviso aunque tampoco cuenten en el %. Además, el aviso cuenta solo los ítems de las secciones que alimentan el %; los ayudantes quedan fuera porque no son categoría de progreso (`SECTIONS`, `js/import.js:7`, no incluye `helpers`); por eso `93000003` («?» en C1) no suma.

```css
/* faltante: caja neutra con iniciales */
.thumb--empty {
  background: var(--fill-3);
  color: var(--label-2);
  font: 600 calc(var(--size) * 0.36)/1 var(--font);   /* 16 px a 44, 18,7 a 52 */
  letter-spacing: 0; text-transform: uppercase;
  user-select: none;
}
/* sin_identificar: "?" y aro discontinuo, para distinguirlo de faltante también en la rejilla */
.thumb--unknown {
  background: var(--fill-4);
  color: var(--label-2);
  font: 600 calc(var(--size) * 0.42)/1 var(--font);
  box-shadow: inset 0 0 0 1.5px var(--fill-1);
}
.thumb--unknown::after {
  content: ""; position: absolute; inset: 3px; border-radius: inherit;
  border: 1px dashed var(--label-3); pointer-events: none;
}
/* imagen existente pero no guardada y sin conexión: esqueleto rayado (≠ faltante, ≠ cargando) */
.thumb--offline {
  background:
    repeating-linear-gradient(135deg, var(--fill-3) 0 4px, transparent 4px 8px),
    var(--thumb-bg);
}
.thumb--offline > img { visibility: hidden; }
.thumb > img:not(.is-loaded) { opacity: 0; }
.thumb > img.is-loaded { opacity: 1; transition: opacity 150ms; }

/* badges de estado (texto, siempre junto al nombre) */
.badge {
  display: inline-block; margin-left: var(--sp-1);
  padding: 1px 6px; border-radius: var(--r-pill);
  background: var(--fill-3); color: var(--label-2);
  font: 500 0.647rem/1.27 var(--font); letter-spacing: 0.01em; font-style: normal;
  vertical-align: 2px; white-space: nowrap;
}
.badge--soft { background: var(--tint-soft); color: var(--tint); }
.badge-id { font-family: var(--font-mono); font-weight: 400; }                 /* siempre junto a .badge: class="badge badge-id" */
.is-unknown .row__title { color: var(--label-2); font-style: italic; }
```

```html
<!-- ok (recorte sobre transparente) -->
<span class="thumb thumb--40"><img src="./images/heroes/barbarian-king.png" alt="" width="40" height="40" loading="lazy" decoding="async"></span>
<!-- ok (tile opaco) -->
<span class="thumb thumb--40 thumb--tile"><img src="./images/spells/lightning-spell.png" alt="" width="40" height="40" loading="lazy" decoding="async"></span>
<!-- faltante: Torre de bombas -->
<span class="thumb thumb--40 thumb--empty" aria-hidden="true">TB</span>
<!-- sin identificar -->
<span class="thumb thumb--40 thumb--unknown" aria-hidden="true">?</span>
```

Reglas de imagen:
- **`width`/`height` fijos al tamaño de visualización** (40, 44, 52, 72, 96), no al del PNG: así el layout no salta y no se reserva memoria de más. `loading="lazy"` y `decoding="async"` siempre, salvo los ayuntamientos de C1 y C2 en Roster (`loading="eager" fetchpriority="high"`). Los PNG pesan mucho (los TH, 8,6 MB entre los 8), así que nunca se usan como fondo CSS ni en `srcset` de otro tamaño.
- `alt=""` cuando la miniatura va junto a su nombre. `alt` con nombre solo cuando la imagen está sola (rejilla de equipamiento → el `aria-label` va en la celda).
- `onload` → `.is-loaded`. `onerror` → si `navigator.onLine === false` o el service worker responde 503 de "no en caché", la caja pasa a `.thumb--offline` y se reintenta en el evento `online`. Con conexión, se registra el error y la caja pasa a `.thumb--empty` con iniciales. **Nunca** se recurre a otra fuente (nada de `assets/wiki/`, emojis ni iconos genéricos).
- **Resolución de la ruta**: `imagenes_por_nivel[String(lvl)]` y, si no existe, `imagen`. Nunca se escriben rutas a mano. Si las dos faltan (`imagen: null`), el ítem se pinta como `faltante` aunque su `estado` sea `ok`.
- **Imágenes pesadas (v1.1)**: si la imagen resuelta trae `pesado: true` (o `bytes` > 3 000 000 si el campo aún no existe), en listas, rejillas, Roster y Mejoras se muestra el estado sin imagen (`.thumb--empty` con iniciales, solo texto) y la imagen real **solo en la ficha del ítem** (`.thumb--96`, `loading="lazy"`) al tocarlo. Tampoco entran en el precache ni en "Descargar todas" sin avisar de su peso. En la v1 no hay ninguna.
- **Aldea del constructor (v1.2 y posteriores)**: sus ítems llegan en el manifiesto con su propia categoría y usan iconos `Icon_BB_*`, con otro estilo de render. Se muestran **siempre en una sección propia, "Aldea del constructor"** (`.section` con su `.section-header` y su propia `.list` o `.eq-grid`), nunca en la misma fila, lista o rejilla que los renders de la aldea principal. La sección va al final de la vista, antes del pie legal. La v1 no trae ítems de la aldea del constructor, así que no aparece.
- Iniciales: primera letra de las dos primeras palabras significativas del nombre visible, ignorando "de", "del", "la", "el" (Torre de bombas → TB, Air Sweeper → AS). Si es una sola palabra, sus dos primeras letras (Mortar → MO, Muro → MU).

### 5.5 Barra de progreso

**Doble referencia en una sola barra.** El ancho completo es el **máximo del TH siguiente**, el relleno es el nivel actual y una **marca vertical** señala el máximo del TH actual. Así se lee de un vistazo cuánto falta para cerrar el TH actual (hasta la marca) y cuánto para el siguiente (hasta el final).

- `--p` = % frente al TH siguiente (`pct_sig_<cat>`). Si no hay TH siguiente (C1 en TH18), `--p` = `pct_<cat>` y **no se renderiza** `.bar__mark`.
- `--m` = posición de la marca = Σ máximos TH actual / Σ máximos TH siguiente × 100. La calcula la capa de datos con los caps de `caps_clashrecord.json`, igual que `analyze.py`. Si no la tiene, se aproxima con `pct_sig / pct × 100` cuando `pct` > 0.
- Al 100 % del TH actual, el relleno pasa a verde y la etiqueta dice **"Máx TH16"**. Sin TH siguiente y al 100 % dice **"Máx"**.

```html
<div class="bar cat-defensas" style="--p: 61.7; --m: 92.2" role="img"
     aria-label="Defensas: 66,9 % del máximo de TH16; 61,7 % del de TH17">
  <span class="bar__fill"></span><span class="bar__mark"></span>
</div>
```

```css
.bar {
  --h: 6px;
  position: relative;
  height: var(--h);
  border-radius: var(--r-pill);
  background: var(--fill-3);
}
.bar__fill {
  position: absolute; inset: 0 auto 0 0;
  width: calc(var(--p, 0) * 1%);
  min-width: var(--h);                     /* un 0,x % sigue viéndose como punto */
  border-radius: inherit;
  background: var(--cat, var(--tint));
  transition: width 300ms cubic-bezier(.2, .8, .2, 1);
}
.bar[data-empty] .bar__fill { min-width: 0; }           /* 0 % real */
.bar__mark {
  position: absolute; top: -3px; bottom: -3px;
  left: calc(var(--m) * 1%);
  width: 2px; margin-left: -1px; border-radius: 1px;
  background: var(--label);
  box-shadow: 0 0 0 1.5px var(--bg-2);     /* halo que la separa del relleno */
}
.bar.is-th-max .bar__fill, .bar.is-max .bar__fill { background: var(--green); }
.bar--lg   { --h: 8px; }                   /* cabeceras, objetivo */
.bar--mini { --h: 4px; width: 56px; flex: none; }
.bar--mini .bar__mark { top: -2px; bottom: -2px; }
.bar--legend { display: inline-block; width: 40px; vertical-align: middle; margin-right: var(--sp-2); }   /* muestra en la leyenda (§7b.1) */

/* Fila de categoría: nombre + % arriba, barra en medio, pie abajo */
.prog { display: grid; grid-template-columns: 1fr auto; row-gap: 6px; align-items: baseline; width: 100%; }
.prog .bar { grid-column: 1 / -1; }
.prog__pct  { font-weight: 600; font-variant-numeric: tabular-nums; min-width: 4.5ch; text-align: right; }
.prog__pct.is-max { color: var(--green-text); }
.prog__foot { grid-column: 1 / -1; font-size: 0.765rem; line-height: 1.385; color: var(--label-2); font-variant-numeric: tabular-nums; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--cat); margin-right: var(--sp-2); }
```

El rojo no aparece en barras **nunca**. Un progreso bajo se ve simplemente como una barra corta.

### 5.6 Barra apilada de muros

Datos: `muros_nv01…muros_nv20`, `muros_total` y `muros_nivel_medio` de `snapshots.csv`, o los `buildings` con `data` 1000010 y `cnt` de la exportación. Máximo de muro por TH (`caps_clashrecord.json`): TH11 12, TH12 13, TH13 14, TH14 15, TH15 16, TH16 17, TH17 18, TH18 19. Se pinta una barra apilada (ancho ∝ piezas) con rampa del color de categoría (más nivel, más saturado) y debajo chips compactos.

```html
<div class="walls" role="img" aria-label="Muros: 273 de nivel 13, 47 de nivel 14, 2 de nivel 16, 2 de nivel 17, 1 de nivel 18">
  <span style="--n: 273; --k: 0.35"></span><span style="--n: 47; --k: 0.46"></span>
  <span style="--n: 2; --k: 0.68"></span><span style="--n: 2; --k: 0.78"></span><span style="--n: 1; --k: 0.89"></span>
</div>
<ul class="wall-chips">
  <li><b>Nv 13</b> × 273</li><li><b>Nv 14</b> × 47</li><li><b>Nv 16</b> × 2</li><li><b>Nv 17</b> × 2</li><li><b>Nv 18</b> × 1</li>
</ul>
<p class="prog__foot">325 piezas · nivel medio 13,2 · máximo TH18: Nv 19</p>
```

```css
.walls {
  display: flex; gap: 1px;
  height: 12px; border-radius: var(--r-pill); overflow: hidden;
  background: var(--fill-3);
}
.walls > span {
  flex: var(--n) 0 0; min-width: 3px;      /* 1 pieza sigue visible */
  background: color-mix(in srgb, var(--cat-muros) calc(var(--k) * 100%), var(--bg-2));
}
.walls > span.is-max { background: var(--green); }
.wall-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: var(--sp-2) 0 0; padding: 0; list-style: none; }
.wall-chips li {
  padding: 2px 8px; border-radius: var(--r-pill); background: var(--fill-3);
  font-size: 0.765rem; line-height: 1.385; color: var(--label-2); font-variant-numeric: tabular-nums;
}
.wall-chips b { font-weight: 600; color: var(--label); }
.wall-chips li.is-max { background: var(--green-soft); color: var(--green-text); }
.wall-chips li.is-max b { color: inherit; }
```

`--k` = 0.35 + 0.65 × (nivel − nivel mínimo presente) / (máximo del TH − nivel mínimo presente), con tope 1. Las piezas al máximo de su TH llevan segmento y chip `.is-max`.

**Lista por nivel** (solo en el detalle de Muros, §7b): una fila por nivel presente con una muestra de color de la misma rampa (`--k` del segmento) en lugar de miniatura. Los muros son `faltante` en el manifiesto y ocho filas de iniciales iguales no aportan nada.

```html
<ul class="list wall-list">
  <li class="row wall-row"><span class="wall-swatch" style="--k: 0.35" aria-hidden="true"></span>
    <span class="row__main"><span class="row__title">Nv 13</span><span class="row__sub">Faltan 6 por pieza · 1638 niveles</span></span>
    <span class="row__trail num">273 piezas</span></li>
  <li class="row wall-row is-max"><span class="wall-swatch" aria-hidden="true"></span>
    <span class="row__main"><span class="row__title">Nv 19</span><span class="row__sub">Máx TH18</span></span>
    <span class="row__trail num">4 piezas</span></li>
</ul>
```

```css
.wall-list .wall-row { min-height: 52px; --row-inset: calc(var(--sp-4) + 12px + var(--sp-3)); }
.wall-swatch {
  flex: none; width: 12px; height: 28px; border-radius: 4px;
  background: color-mix(in srgb, var(--cat-muros) calc(var(--k) * 100%), var(--bg-2));
  box-shadow: inset 0 0 0 0.5px var(--separator);
}
.wall-row.is-max .wall-swatch { background: var(--green); box-shadow: none; }
.wall-row .row__title { font-variant-numeric: tabular-nums; }
.wall-row.is-max .row__sub { color: var(--green-text); }
.wall-row .row__trail { flex: none; color: var(--label); font-size: 0.882rem; font-weight: 600; }
```

### 5.7 Chips

```css
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  height: 22px; padding: 0 8px;
  border-radius: var(--r-pill);
  background: var(--fill-3); color: var(--label);
  font-size: 0.765rem; font-weight: 600; line-height: 1;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.chip--goal-ok { background: var(--green-soft); color: var(--green-text); }               /* "Objetivo TH18" alcanzado */
.chip--main    { background: var(--tint-soft); color: var(--tint); }                      /* "Principal" (C1) */
.chip--second  { background: transparent; color: var(--tint); box-shadow: inset 0 0 0 1px var(--tint); } /* "Secundaria" (C2) */
.chip--muted   { background: var(--fill-4); color: var(--label-2); font-weight: 400; }   /* "Sin importar", "Constructor" */
.chip--warn    { background: color-mix(in srgb, var(--orange) 16%, var(--bg-2)); color: var(--orange-text); } /* "Revisar constructores"; opaco: AA también sobre --bg */
.chip--sm      { height: 18px; padding: 0 6px; font-size: 0.706rem; }                    /* chip de cuenta compacto en filas de mejora */
.chip--account { height: 28px; padding: 0 10px 0 3px; gap: 6px; }
.chip--account .thumb { --size: 22px; padding: 1px; border-radius: 50%; }
```

Textos: `TH18` · `TH16 → 17` · `Objetivo TH18` (verde al alcanzarse) · `Principal` · `Secundaria` · `Sin importar` · `C1` / `13·8JG` (chip de cuenta compacto, sin miniatura, 18 px de alto en filas de mejora: `.chip.chip--muted.chip--sm`).

### 5.8 Botones

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
  min-height: 50px; padding: var(--sp-2) var(--sp-5);
  border: 0; border-radius: var(--r-btn);
  font: 600 1rem/1.294 var(--font); letter-spacing: -0.024em;
  cursor: pointer; user-select: none; -webkit-user-select: none;
  text-decoration: none;                    /* también cuando es <a> */
  transition: opacity 120ms;
}
.btn:active { opacity: 0.7; }
.btn[disabled] { background: var(--fill-3); color: var(--label-2); cursor: default; opacity: 1; }
.btn--primary   { background: var(--tint-fill); color: var(--on-tint); }
.btn--secondary { background: var(--tint-soft); color: var(--tint); }
.btn--plain     { background: transparent; color: var(--tint); font-weight: 400; }
.btn--destructive { background: transparent; color: var(--red-text); font-weight: 400; }
.btn--block { display: flex; width: 100%; }
.btn--small { min-height: 34px; padding: 0 14px; border-radius: var(--r-pill); font-size: 0.882rem; }

/* Botón de texto en nav bar ("Importar", "Ajustes", "Cancelar", "‹ Progreso") */
.btn-text {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 44px; min-width: 44px; padding: 0 var(--sp-2);
  background: none; border: 0; color: var(--tint); text-decoration: none;
  font: 400 17px/22px var(--font); letter-spacing: -0.41px;
}
.btn-text--bold { font-weight: 600; }
```

### 5.9 Segmented control

```html
<div class="seg" role="tablist" aria-label="Vista">
  <button role="tab" aria-selected="true">Por fin</button>
  <button role="tab" aria-selected="false">Por cuenta</button>
</div>
```

```css
.seg {
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
  height: 32px; padding: 2px;
  border-radius: var(--r-seg);
  background: var(--fill-3);
}
.seg > button {
  position: relative;
  border: 0; background: transparent; color: var(--label);
  border-radius: var(--r-seg-thumb);
  font: 500 13px/18px var(--font); letter-spacing: -0.08px;
}
.seg > button::after { content: ""; position: absolute; inset: -8px 0; }   /* 44 px táctiles */
.seg > button[aria-selected="true"] { background: var(--seg-thumb); font-weight: 600; box-shadow: var(--shadow-thumb); }
.seg-wrap { margin: 0 var(--margin-r) var(--sp-4) var(--margin-l); }
```

### 5.10 Estado vacío

```html
<div class="card empty">
  <p class="t-title3">Aún no hay datos</p>
  <p class="t-subhead c-2">Importa la exportación JSON de cada cuenta para ver su progreso.</p>
  <button class="btn btn--primary">Importar JSON</button>
</div>
```

```css
.empty { display: grid; justify-items: center; gap: var(--sp-2); padding: var(--sp-10) var(--sp-6); text-align: center; }
.empty p { margin: 0; max-width: 30ch; }
.empty .btn { margin-top: var(--sp-3); }
```

No lleva ilustraciones ni iconos: solo texto y acción.

### 5.11 Skeleton (cargando datos)

Los datos se leen de almacenamiento local y tardan muy poco. Es distinto del `.thumb--offline` rayado: el skeleton es liso y pulsa.

**Regla de los 150 ms** (vale para este skeleton y para «Validando…» de Importar, §8.3):
- Al empezar la carga (con el texto ya disponible; nunca durante una espera del sistema, como el globo «Pegar» de iOS) se arranca un **temporizador de 150 ms**. Si el resultado llega antes, se pinta directamente el resultado y el skeleton **no llega a pintarse nunca**.
- Solo si el temporizador vence sin resultado se pinta el skeleton, y se queda hasta que llega el resultado.
- Está prohibido pintarlo siempre y quitarlo uno o dos frames después: eso es un destello (1.1.1 lo hacía en Importar, ~33 ms).
- Si el trabajo es síncrono (p. ej. validar varias exportaciones), se cede el hilo entre trozos (`await` entre archivos) para que el temporizador pueda vencer.

```css
.sk { background: var(--fill-4); border-radius: 6px; color: transparent; }
.sk--line  { height: 0.9em; width: 60%; }
.sk--thumb { width: var(--size, 44px); height: var(--size, 44px); border-radius: calc(var(--size, 44px) * 0.225); }
@media (prefers-reduced-motion: no-preference) {
  .sk { animation: sk-pulse 1.2s ease-in-out infinite; }
  @keyframes sk-pulse { 50% { opacity: 0.5; } }
}
```

### 5.12 Toast y alerta

```css
.toast {
  position: fixed; z-index: 50;
  left: 50%; transform: translateX(-50%);
  bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--sp-3));
  width: max-content;                        /* sin esto, con left: 50% el toast se parte en dos líneas a mitad de ancho */
  max-width: calc(100vw - 2 * var(--margin));
  display: flex; align-items: center; gap: var(--sp-2);
  padding: 12px 16px; border-radius: var(--r-pill);
  font: 600 15px/20px var(--font); letter-spacing: -0.24px; color: var(--label);
}                                            /* + .material-float */
.toast::before { content: ""; width: 8px; height: 8px; border-radius: 50%; flex: none; }
.toast--ok::before  { background: var(--green); }
.toast--err::before { background: var(--red); }
@media (prefers-reduced-motion: no-preference) {
  .toast { animation: toast-in 240ms cubic-bezier(.2, .8, .2, 1); }
  @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 12px); } }
}

.alert-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.4); display: grid; place-items: center; }
.alert { width: min(calc(270rem / 17), calc(100vw - 2 * var(--margin))); max-height: calc(100dvh - 2 * var(--margin)); overflow: auto; border-radius: var(--r-sheet); text-align: center; }   /* + .material-float */
.alert__body  { padding: 19px 16px; }
.alert__title { margin: 0 0 2px; font: 600 1rem/calc(22rem / 17) var(--font); }
.alert__msg   { margin: 0; font: 400 calc(13rem / 17)/calc(18rem / 17) var(--font); }
.alert__actions { display: grid; grid-auto-flow: column; border-top: 0.5px solid var(--separator); }
.alert__actions button { min-height: 44px; border: 0; background: none; color: var(--tint); font: 400 1rem/calc(22rem / 17) var(--font); }
.alert__actions button + button { border-left: 0.5px solid var(--separator); }
.alert__actions .is-default { font-weight: 600; }
.alert__actions .is-destructive { color: var(--red-text); }
```

La alerta escala con Dynamic Type: letra en `rem` (17/13 px a tamaño normal) y ancho `min(270 px a 17 px, 100vw − 2 márgenes)`.

El toast dura 3 s, lleva `role="status"` y no tiene botones. Las alertas se reservan para acciones que borran o sustituyen datos: "Borrar todos los datos", "Restaurar datos incluidos", "Borrar imágenes guardadas" y "Quitar cuenta" (§7e, §8.4). Son las cuatro de la app; no hay `confirm()` nativos. "Importar igualmente" ya no existe; un tag ajeno se ofrece como cuenta nueva (§8.10, decisión 1).

```html
<div class="alert-backdrop">
  <div class="alert material-float" role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-msg">
    <div class="alert__body"><p class="alert__title" id="alert-title">¿Borrar todos los datos?</p><p class="alert__msg" id="alert-msg">Se eliminarán…</p></div>
    <div class="alert__actions"><button data-alert="0" data-alert-cancel>Cancelar</button><button class="is-destructive" data-alert="1">Borrar</button></div>
  </div>
</div>
```

**Foco de la alerta** (WAI-ARIA `alertdialog`).
- Al abrir, el foco va a Cancelar, la acción segura. Nunca va a la destructiva ni se queda en el sheet de detrás.
- Mientras está abierta, todo `#app` salvo `.alert-backdrop` y `.toast` lleva `inert`, también el sheet. Tab y Mayús+Tab recorren solo los botones de la alerta, en ciclo.
- Esc equivale a Cancelar: cierra solo la alerta, no el sheet.
- Al cerrar con cualquier botón o con Esc, el foco vuelve al control que la abrió. Si ese control ya no existe, va a su equivalente (tras «Borrar imágenes guardadas», a «Descargar todas»), luego al control que ocupa su sitio en el cuerpo del sheet (tras «Quitar …», la fila siguiente) y, si no hay ninguno, al `h2` del sheet.
- Un toque en el velo no la cierra, igual que en iOS.

### 5.13 Sheet (Ajustes, Importar, ficha de ítem)

```css
.sheet-backdrop { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.4); }
.sheet {
  position: fixed; z-index: 41; left: 0; right: 0; bottom: 0;
  top: calc(env(safe-area-inset-top) + 10px);
  display: flex; flex-direction: column;
  background: var(--bg);
  border-radius: var(--r-sheet) var(--r-sheet) 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet--half { top: auto; max-height: 60dvh; }            /* ficha de ítem */
.sheet__grabber { width: 36px; height: 5px; border-radius: 3px; background: var(--fill-1); margin: 5px auto 0; }
.sheet__bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: 56px; padding: 0 var(--sp-2); }
.sheet__bar h2 { margin: 0; font: 600 17px/22px var(--font); letter-spacing: -0.41px; }
.sheet__bar > :last-child { justify-self: end; }
.sheet__body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding-top: var(--sp-2); }
.sheet__actions { padding: var(--sp-3) var(--margin-r) var(--sp-3) var(--margin-l); }
@media (prefers-reduced-motion: no-preference) {
  .sheet { animation: sheet-in 320ms cubic-bezier(.2, .9, .3, 1); }
  @keyframes sheet-in { from { transform: translateY(100%); } }
}
#app[data-sheet-keep="true"] .sheet { animation: none; }   /* redibujado del mismo sheet: no vuelve a subir */
```

**Redibujado.** El sheet solo sube al abrirse.
- Un redibujado con el mismo sheet abierto no repite `sheet-in`. Ocurre, por ejemplo, al cambiar de modo o de paso en Importar, al terminar una descarga o al quitar una cuenta. `render()` marca `#app[data-sheet-keep]` antes de sustituir el HTML.
- El scroll de `.sheet__body` se conserva mientras la vista sea la misma. En Importar, la misma vista es el mismo modo, la misma fase y la misma fila del lote.
- Si el control con foco queda tapado por el borde del cuerpo, el cuerpo se desplaza lo justo para que se vea entero, anillo de foco incluido.

**Foco.** El foco va al `h2` del sheet (`tabindex="-1"`) solo al abrir; un redibujado lo conserva. Si un redibujado elimina el control con foco, el foco va a su equivalente o, si no existe, al `h2`. Mientras está abierto, `.navbar`, `#screen` y `.tabbar` llevan `inert`. Esc cierra igual que OK, el velo o Cancelar; en un subpaso de Importar, Esc equivale a «‹ Importar». Al cerrar, el foco vuelve al mismo control que lo abrió (la fila `[data-ficha]`, «Ajustes» o «Importar»; por posición si comparte selector).

### 5.14 Pie legal (Fan Content Policy, obligatorio)

**Texto exacto** (literal de `FAN_CONTENT_POLICY.md`, página "Last updated: September 27, 2023"). Va **en inglés, sin cambios**, con la traducción al español debajo:

> This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.

**Ubicación**: al final del contenido desplazable de **cada vista** (Roster, Progreso, detalle, Mejoras, Evolución) y de los sheets de Importar y Ajustes, siempre por encima de la tab bar. No es fijo, para no quitar altura útil, y nunca se oculta ni se trunca. En Ajustes → Acerca de va la versión completa (§7e).

```html
<footer class="legal">
  <p lang="en">This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: <a href="https://www.supercell.com/fan-content-policy" rel="noopener">www.supercell.com/fan-content-policy</a>.</p>
  <p>Material no oficial, no respaldado por Supercell. Más información en la Política de contenido de fans de Supercell.</p>
</footer>
```

```css
.legal {
  margin: var(--sp-8) var(--margin-r) 0 var(--margin-l);
  padding: 0 var(--sp-4);
  font-size: 0.706rem; line-height: 1.333;   /* Caption 1: 12 px, escala con Dynamic Type */
  color: var(--label-2);                      /* AA; nunca --label-3 */
  text-align: center; text-wrap: balance;
}
.legal p { margin: 0 0 var(--sp-1); }
.legal a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
```

---

## 6. Navegación, tab bar, safe areas y meta tags PWA

### 6.1 `<head>`

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Clash Progreso">
<meta name="format-detection" content="telephone=no">  <!-- que los tags #GVPU80R80 no se conviertan en enlaces -->
<link rel="apple-touch-icon" href="./icons/apple-touch-icon-180.png">
<link rel="manifest" href="./manifest.webmanifest">
```

`manifest.webmanifest`: `"lang": "es"`, `"name": "Clash Progreso"`, `"display": "standalone"`, `"start_url": "./#/roster"`, `"scope": "./"`, `"background_color": "#F2F2F7"`, `"theme_color": "#F2F2F7"`. El icono de la app **no** puede ser un asset del Fan Kit modificado (recortado o con fondo añadido). Propongo un icono tipográfico propio: "CP" en SF Pro Bold blanco sobre `#0066CC`, 180×180, sin arte de Supercell.

Con `black-translucent` el contenido pasa por debajo de la barra de estado. Por eso **todo** el padding superior sale de `env(safe-area-inset-top)` (59 px en iPhone 15/16, 47 px en modelos con notch). iOS dibuja la hora en blanco, así que en modo claro la nav bar colapsada (material claro) puede dejarla con poco contraste sobre fondo claro. Hay que probarlo en un dispositivo real. Si se ve mal, se cambia a `default` y el padding superior pasa a 0 (iOS reserva la franja).

### 6.2 Large Title que colapsa

La estructura es una nav bar fija y transparente (44 px + safe area) más un Large Title en el flujo del documento. Cuando el título pasa por debajo de la barra, esta se vuelve material y muestra el título pequeño.

```html
<header class="navbar" data-collapsed="false">
  <div class="navbar__inner">
    <div class="navbar__lead"><button class="btn-text">Ajustes</button></div>
    <h1 class="navbar__title" aria-hidden="true">Roster</h1>
    <div class="navbar__trail"><button class="btn-text btn-text--bold">Importar</button></div>
  </div>
</header>
<main class="screen">
  <h1 class="large-title">Roster</h1>
  <p class="large-sub">11 cuentas · última importación mié 07/10 21:26</p>
  …
</main>
```

```css
.navbar {
  position: fixed; z-index: 20; top: 0; left: 0; right: 0;
  padding-top: env(safe-area-inset-top);
  background: transparent;
  transition: background-color 200ms, box-shadow 200ms;
}
.navbar__inner {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  height: var(--navbar-h);
  padding: 0 calc(var(--margin-r) - 8px) 0 calc(var(--margin-l) - 8px);
}
.navbar__lead { justify-self: start; }
.navbar__trail { justify-self: end; }
.navbar__title { margin: 0; font: 600 17px/22px var(--font); letter-spacing: -0.41px; opacity: 0; transition: opacity 200ms; }
.navbar[data-collapsed="true"] { background: var(--material-bar-solid); box-shadow: 0 0.5px 0 var(--bar-hairline); }
.navbar[data-collapsed="true"] .navbar__title { opacity: 1; }
@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .navbar[data-collapsed="true"] {
    background: var(--material-bar);
    -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px);
  }
}
.large-title {
  margin: 0 var(--margin-r) 0 var(--margin-l);
  padding: 3px 0 8px;
  font-size: 2rem; line-height: 1.206; font-weight: 700; letter-spacing: 0.011em;
}
.large-sub { margin: -4px var(--margin-r) var(--sp-4) var(--margin-l); font-size: 0.765rem; line-height: 1.385; color: var(--label-2); font-variant-numeric: tabular-nums; }
```

```js
// Una vez por vista: colapsa cuando el Large Title queda bajo la nav bar
const nav = document.querySelector('.navbar');
const io = new IntersectionObserver(([e]) => { nav.dataset.collapsed = String(!e.isIntersecting); },
  { rootMargin: `-${nav.offsetHeight}px 0px 0px 0px`, threshold: 0 });
io.observe(document.querySelector('.large-title'));
```

Las vistas *push* (detalle de categoría) llevan a la izquierda `.btn-text` con un chevron izquierdo SVG de 12×20 y el texto "Progreso". El título va directamente pequeño, sin Large Title, y la nav bar ya colapsada.

### 6.3 Tab bar inferior

Hay cuatro pestañas: **Roster · Progreso · Mejoras · Evolución**. Los iconos son SVG de UI propios con trazo de 1,8 px (no son SF Symbols ni ítems del juego).

```html
<nav class="tabbar material-bar" aria-label="Secciones">
  <a href="#/roster" aria-current="page"><svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="5" width="8" height="8" rx="2"/><rect x="16" y="5" width="8" height="8" rx="2"/><rect x="4" y="16" width="8" height="8" rx="2"/><rect x="16" y="16" width="8" height="8" rx="2"/></svg><span>Roster</span></a>
  <a href="#/progreso"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 8h18M5 14h12M5 20h15"/></svg><span>Progreso</span></a>
  <a href="#/mejoras"><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9.5"/><path d="M14 8.5V14l3.5 2.5"/></svg><span>Mejoras</span></a>
  <a href="#/evolucion"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 21l6-6 4 3 9-9"/><path d="M4 24h20"/></svg><span>Evolución</span></a>
</nav>
```

```css
.tabbar {
  position: fixed; z-index: 20; left: 0; right: 0; bottom: 0;
  display: grid; grid-template-columns: repeat(4, 1fr);
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  box-shadow: 0 -0.5px 0 var(--bar-hairline);
}
.tabbar a {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  gap: 1px; padding-top: 5px; min-height: 44px;
  color: var(--label-2); text-decoration: none;
  font: 500 10px/12px var(--font); letter-spacing: 0.1px;   /* px fijos, como iOS */
}
.tabbar svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.tabbar a[aria-current="page"] { color: var(--tint); }
.tabbar a[aria-current="page"] svg { stroke-width: 2.2; }
.tabbar a[aria-current="page"] :is(rect, circle) { fill: color-mix(in srgb, currentColor 18%, transparent); }
.tabbar a:active { opacity: 0.6; }
```

Inactivo `--label-2` (5,0:1 sobre la barra) y activo `--tint`. Volver a tocar la pestaña activa hace scroll arriba (`behavior: 'smooth'`, o `'auto'` si se reduce el movimiento). Con un sheet abierto, la tab bar queda bajo el backdrop.

### 6.4 Ajustes: botón en la nav bar, no quinta pestaña

**Decisión**: "Ajustes" es un `.btn-text` a la **izquierda de la nav bar de Roster** (a la derecha está "Importar") y abre un sheet a pantalla completa (§7e). Motivos:
1. **Frecuencia**: la HIG reserva la tab bar para secciones de uso continuo. Ajustes se abre rara vez (una descarga de imágenes y poco más). La acción frecuente, importar, ya tiene acceso directo con "Importar" en Roster y en todos los estados vacíos.
2. **Pulgar**: con 4 pestañas cada objetivo mide ≈ 98 px de ancho en un iPhone de 393. Con 5 bajaría a 78 y se apretarían las etiquetas ("Evolución" es la más larga).
3. **Contexto**: un sheet modal deja claro que Ajustes es una tarea aparte y se cierra con "OK" o deslizando hacia abajo, como Ajustes en Salud, Fitness o la App Store.
4. El precio es que el botón queda arriba, lejos del pulgar. Se acepta porque es una acción ocasional, y el pie de Roster repite un enlace de texto "Ajustes y aviso legal" (`.btn--plain`, 44 px) justo encima del aviso legal, al alcance del pulgar al final del scroll.

---

## 7. Vistas

Referencia: iPhone 15/16, 393×852 pt, safe area superior de 59 e inferior de 34. Por encima del pliegue quedan unos **614 px** de contenido (852 − 59 − 44 nav − 52 Large Title − 49 tab − 34). Las alturas están en px con Dynamic Type por defecto y son orientativas: ningún componente tiene altura fija salvo el chrome.

### Datos de cuentas (fijos en la app)

| Orden | Clave | Nombre visible | Tag | TH hoy | Objetivo |
|---|---|---|---|---|---|
| 1 | C1 | **C1 Principal** | #28PLGP0G2 | 18 | **TH18** |
| 2 | C2 | **C2 Secundaria** | #R00C8CPQC | 16 | **TH17** |
| 3–6 | TH13 | `#GUQUV98JG` `#GVG9GCYUV` `#R02YVYLJ8` `#GJPJP9JP0` | idem | 13 | **TH15** |
| 7–11 | TH11 | `#GVPU80R80` `#GVUQ2C2VC` `#GVVYVU802` `#GVPU2CJR8` `#R02YUVC0J` | idem | 11 | **TH15** |

- Las nueve cuentas sin alias se nombran con su tag (`.tag`, mono).
- Etiqueta corta para chips: `C1`, `C2` y, para el resto, TH + los 3 últimos caracteres del tag: `13·8JG` `13·YUV` `13·LJ8` `13·JP0` `11·R80` `11·2VC` `11·802` `11·JR8` `11·C0J`. Todas son únicas.
- El TH actual sale siempre del dato importado (building 1000001), no de esta tabla. El objetivo es la columna `th_objetivo` del CSV y coincide con la tabla.
- Si Miguel pone alias en el futuro, el alias pasa a ser el título y el tag baja al subtítulo.
- **Cuentas añadidas** (desde el 7 oct 2026, §8.4): se guardan en el iPhone como `{tag, alias, añadida}` y van **después de las 11**, en orden de alta. No tienen objetivo (`Sin objetivo`), y el objetivo TH18 + TH17 + 9×TH15 de Evolución no cambia. No entran en el cálculo de ese objetivo y no se les asigna objetivo de TH: lo decide Miguel (Clash, 7 oct 2026). Etiqueta corta: TH + 3 últimos caracteres del tag, igual que las demás (`16·8CU`); si coincidiera con una existente, se añade un carácter más.

### 7a. Roster (`#/roster`)

**Jerarquía**: nav (Ajustes ← · → **Importar**) → Large Title "Roster" + subtítulo → **Principales** (C1 y C2 en tarjetas grandes) → **TH13 · 4 cuentas** (lista) → **TH11 · 5 cuentas** (lista) → **Otras cuentas · N** (lista, solo si hay cuentas añadidas, §8.4) → enlace "Ajustes y aviso legal" → pie legal.

**Sin hacer scroll** (≈ 614 px): subtítulo (20) + cabecera (26) + C1 (112) + 8 + C2 (112) + 32 + cabecera TH13 (26) + **4 filas** de 64. Las principales siempre a la vista y el grupo TH13 casi entero.

**Tarjeta C1/C2** (`.card.card--tap.account-card`):

```
┌───────────────────────────────────────────────┐
│ ┌──────┐  C1 Principal  [Principal]            │  t-headline + .chip--main  (C2: .chip--second "Secundaria")
│ │ TH18 │  [TH18] [Objetivo TH18]               │  .chip + .chip--goal-ok    (C2: [TH16 → 17])
│ │ 72px │  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  63,6 %     │  .bar--lg (media) + % 15 px 600
│ └──────┘  10 mejoras · próxima dom 11/10 21:46 │  footnote c-2
└───────────────────────────────────────────────┘
```

```css
.account-card { display: grid; grid-template-columns: 72px 1fr; column-gap: var(--sp-3); align-items: center; }
.account-card > .thumb { grid-row: 1 / span 4; align-self: start; }
.account-card__title { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); row-gap: var(--sp-1); font: 600 1rem/1.294 var(--font); min-width: 0; }   /* el chip «Secundaria» baja bajo el nombre con texto grande */
.account-card__chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.account-card__bar { display: grid; grid-template-columns: 1fr auto; gap: var(--sp-2); align-items: center; }
.account-card__bar .num { font-weight: 600; font-size: 0.882rem; }
.account-card__meta { margin-top: 4px; font-size: 0.765rem; line-height: 1.385; color: var(--label-2); font-variant-numeric: tabular-nums; }
```

- Miniatura: `items["1000001"].imagenes_por_nivel[String(th)]` en `.thumb--72` (`loading="eager"`). Los TH son `recorte_sobre_transparente` y van sobre `--thumb-bg`.
- La barra muestra la media con doble referencia (§5.5): `--p` = `pct_sig_media`, la marca en el máximo del TH actual y el % rotulado = `pct_media`. C1, en TH18, lleva barra simple.
- C1 y C2 se distinguen por el chip (`Principal` relleno / `Secundaria` con contorno) y por la tarjeta grande. **En el roster no se muestran niveles de héroes.**

**Fila TH13/TH11** (`.row.row--thumb44.row--account`, 64 px): TH del nivel en `.thumb--44` · título `#GUQUV98JG` (`.tag`) · subtítulo `TH13 → 15 · 7 mejoras` · trailing `.bar--mini` + `62,9 %` (`.num` 15 px 600) + chevron. El orden de la tabla es fijo y nunca se reordena por %.

- **El tag es el nombre de la cuenta y no se recorta nunca.** Con cuerpo de 19 px o más (contenedor `.list` ≤ 19em, §5.3), la fila pasa a dos líneas. Arriba van miniatura, tag entero y subtítulo. Debajo, alineados con el texto, la barra a todo el ancho libre, el % y el chevron. La fila «Sin importar» lleva la misma clase.

**Toque**: abre `#/progreso` con esa cuenta seleccionada.

**Estados**
- *Cuenta sin importar*: la fila sigue ahí (el roster es fijo), con `.thumb--empty` "TH", subtítulo `.chip--muted` "Sin importar" y sin barra.
- *Ninguna importada*: tras el subtítulo, `.card.empty` ("Aún no hay datos" / "Importa la exportación JSON de cada cuenta para ver su progreso." / **Importar JSON**) y debajo las 11 filas "Sin importar".
- *Cargando*: 2 tarjetas skeleton de 112 px y 9 filas skeleton.
- *Datos antiguos* (exportación de más de 7 días): la meta pasa a `--orange-text`, p. ej. `Datos del 07/10 · hace 9 días`.

### 7b. Progreso (`#/progreso`): detalle de cada cuenta

**Jerarquía**: Large Title "Progreso" → selector de cuenta → resumen → segmented **Categorías | Equipamiento** → contenido → pie legal.

1. **Selector de cuenta** (`.list` con una `.row.row--thumb44`): TH en `.thumb--44`, título `C2 Secundaria` / tag, subtítulo `TH16 · objetivo TH17 · datos de mié 07/10 21:23` y, a la derecha, un SVG de chevron doble (9×14). Encima va un `<select>` nativo transparente (`position:absolute; inset:0; opacity:0; font-size:16px`) que en iOS saca la rueda del sistema, cómoda con una mano. Las opciones siguen el orden fijo del roster.
2. **Resumen** (`.card.summary`, grid de 2 columnas con divisor de 0,5 px `--separator`):
   - `Media` → `48,8 %` (`.t-title1 .num`) + `del máximo de TH16` (footnote c-2) + `TH17: 45,9 %` (footnote c-2, solo si hay TH siguiente).
   - `Ofensiva` → `pct_ofensiva` con el mismo formato.
   ```css
   .summary { display: grid; grid-template-columns: 1fr 1fr; padding: 0; }
   .summary > div { min-width: 0; padding: var(--sp-2) var(--sp-1); }
   .summary > div + div { box-shadow: inset 0.5px 0 var(--separator); padding-left: var(--sp-4); }
   .section:has(> .summary) { container-type: inline-size; }
   @container (max-width: 13em) {             /* SE y 390 px a 28 px: una columna */
     .summary { grid-template-columns: 1fr; }
     .summary > div + div { box-shadow: inset 0 0.5px var(--separator); padding-left: var(--sp-1); }
   }
   ```
3. **Segmented** `Categorías | Equipamiento` (§5.9), 32 px. El equipamiento es la prioridad de Miguel y queda **a un toque y por encima del pliegue**. La pestaña elegida se recuerda por cuenta en `localStorage`.

#### 7b.1 Pestaña Categorías

- **Leyenda** (`.section-footer` sobre el grupo, con una barra de ejemplo `span.bar.bar--legend`): "Relleno: nivel actual · Marca: máximo TH16 · Final: máximo TH17". En C1: "Relleno: nivel actual frente al máximo de TH18".
- **Categorías** (`.list`; cada `li.row` contiene un `.prog`, padding 12/16, ≈ 74 px), en el orden fijo de §2:
  ```
  ● Defensas                                  66,9 %
  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬|▬▬▬▬▬
  TH17: 61,7 % · faltan N niveles                     ›
  ```
  - `.dot` + nombre en `t-body`. `.prog__pct` = % frente al TH actual. Barra según §5.5. El pie lleva el % frente al TH siguiente y los niveles pendientes (`pend` de `summarize()`).
  - Al 100 % del TH actual: `.prog__pct.is-max` con el texto `Máx TH16` y la barra `.is-th-max`.
  - Si una categoría no tiene dato en ese TH (Mascotas en TH13 y TH11: columna vacía en el CSV), la fila se queda en su sitio con `Se desbloquea en TH14` en `--label-2` y sin barra.
  - La fila "Equipamiento" no abre un detalle aparte: cambia el segmented a **Equipamiento**.
  - **Héroes no se destacan**: van en 6.º lugar, con el mismo estilo que el resto, sin badges de aviso, sin texto "cuello de botella" y fuera de cualquier lista de "lo más atrasado". Si algún día se añade un resumen de "dónde mejorar", C1 excluye héroes por configuración (`heroesSecundarios: ['#28PLGP0G2']`).
- **Muros por nivel** (`.card`): `Muros` + `69,5 %`, barra apilada y chips (§5.6), pie `325 piezas · nivel medio 13,2 · máximo TH18: Nv 19`.
- **Héroes** (`.list`, filas `.row--thumb40` con `images/heroes/*.png`): nombre, `Nv 61 / 110` (`.num`; máximo de `caps_clashrecord.json`) y `.bar--mini` de su color de categoría, en el orden del juego (Rey Bárbaro, Reina Arquera, Gran Centinela, Luchadora real, Príncipe Esbirro, Duque Dragón). Los ítems con estado `id_deducido` en el manifiesto (hoy el Duque Dragón, 28000007) llevan el badge **`ID deducido`**.

**Detalle de categoría** (`#/progreso/<tag>/<cat>`, push con "‹ Progreso"; la primera `.section` lleva 16 px de margen bajo la nav, §5.1): arriba una `.card` con `.prog` grande (`.bar--lg`) y debajo una `.list` de ítems `.row--thumb40`, cada uno con su miniatura según el estado del manifiesto (§5.4), nombre, `×6` si `cnt` > 1, subtítulo `Nv 15 / 17 · TH17: 18` y trailing `.bar--mini`. Se agrupan en:
- "Pendientes", ordenados por % ascendente **dentro** de la categoría.
- "Sin desbloquear" (`lvl` 0, `Nv 0 / 5`).
  - **Ítems que solo están en `caps_clashrecord.json`** (sin ID ni entrada en el manifiesto; hoy la Inferno Artillery, defensa de TH17, 1 unidad, máx. 5, decidido por Clash el 8 oct 2026): aparecen aquí con la miniatura de `faltante` (iniciales `IA`) y el nombre tal como viene en `caps_clashrecord.json` (en inglés y sin badge en la lista). El trailing sigue la regla general de máximos: si el TH de la cuenta tiene la clave, `Nv 0 / 5` con barra vacía; si no la tiene, `Disponible en TH17` sin barra (C2, TH16, corregido el 8 oct 2026 a propuesta de Clash). El % lo decide Clash. Su ficha no tiene `.badge-id` y lleva solo las notas `Sin imagen` y `Nombre en español sin confirmar`. [Nota interna, no se muestra: Imágenes comprobó el 8 oct 2026 que el Fan Kit no tiene ningún recurso de la Inferno Artillery.] Entra en el PR de imágenes. No se le inventa un ID.
- "Al máximo" (`Máx` en `--green-text`).
- "Sin identificar", al final, con el aviso `.section-footer` `N ítems sin identificar no cuentan en el %.` (singular: `1 ítem sin identificar no cuenta en el %.`).
  - N solo cuenta los que de verdad quedan fuera del %, con la **misma comprobación que decide el %** (§5.4, «Qué cuenta en el %»), no con el `estado` del manifiesto: no entran los que tienen tope en `caps_clashrecord.json` para el TH de la cuenta y llevan barra (p. ej. 107000008 en C1, `Nv 1 / 5`), ni los `crafting_module` (102000033–102000041), que sí cuentan en Defensas vía `craftedScore`.
  - **Si N es 0, no hay aviso** (el grupo puede seguir saliendo, p. ej. con los módulos). El texto termina en «en el %.»: la coletilla de 1.1.1 «salvo cuando el archivo de máximos les da un tope (laboratorio, defensas crafteadas y el guardián sin ficha)» se quita, porque con esta regla nunca es cierta.
  - Con el manifiesto v1.2 y los datos del 07/10: Defensas no lleva aviso en ninguna de las 11 cuentas; Laboratorio de C1 lleva `3 ítems…`. La suma de estos avisos más las piezas sin identificar de Equipamiento es la N de la vista previa de Importar (§8.4).
- **Logger (107000008, guardián de TH18)**: aceptado como Logger por la clave `Guardian-Logger` de caps (`ALIAS` en `js/progress.js`, decisión del equipo del 8 oct 2026). Imágenes lo pasa a `id_deducido` en el próximo set de imágenes. Se presenta como el Duque Dragón y la Inferno Artillery:
  - título de fila = `nombre_en` `Logger`, **sin inventar nombre en español**; `.badge` `ID deducido`;
  - en la ficha, la footnote `Nombre en español sin confirmar` y la nota de `id_deducido` (§5.4);
  - imagen del Fan Kit solo si existe; si no, miniatura `faltante` con iniciales y `Sin imagen` en la ficha;
  - los porcentajes no cambian: ya cuenta hoy (`Nv 1 / 5` en C1).
  - Mientras el manifiesto lo tenga como `sin_identificar` (v1.2), la app sigue leyendo el `estado` (§5.4) y lo pinta con «?» e `ID 107000008` en el grupo «Sin identificar», con su barra, pero **no** entra en N.

**Detalle de Muros** (`#/progreso/<tag>/muros`). No hay ítems sueltos, así que la estructura cambia:
- **Tarjeta** (`.card.cat-muros`): el mismo `.prog` grande que el resto de detalles (`Muros` + `69,5 %`, `.bar--lg` con doble referencia y pie `TH12: 40,7 % · faltan 2011 niveles` o `Faltan 1884 niveles` en C1). Debajo, la barra apilada `.walls` (con `margin-top: 12px`), los chips `.wall-chips` y el pie `.prog__foot` `325 piezas · nivel medio 13,2 · máximo TH18: Nv 19` (§5.6). Es la misma tarjeta que en la pestaña Categorías más la línea de referencia del TH siguiente.
- **Datos**: `buildings` de la exportación con `data` 1000010, una entrada por nivel con `lvl` y `cnt`. El máximo de muro del TH sale de `caps_clashrecord.json` (TH11 12 … TH18 19, §5.6). Sin CSV ni valores inventados.
- **Sección «Por nivel»** (`.section-header` con `325 piezas` a la derecha) y `.list.wall-list` (§5.6). Hay una fila por nivel presente, en orden ascendente (el mismo de los chips).
  - Título: `Nv 13`. Trailing: `273 piezas` (`1 pieza` en singular).
  - Subtítulo: `Faltan 6 por pieza · 1638 niveles`, con `nivel` en singular. Los «niveles» de cada fila suman el `faltan` de la tarjeta y se cuentan frente al máximo del TH **actual**, como `pend`.
  - Al máximo del TH actual: `.is-max`, muestra verde y subtítulo `Máx TH18` en `--green-text`.
  - Las filas no se pueden tocar, no llevan chevron y no abren ficha.
- Comprobado con C1: 13×273, 14×47, 16×2, 17×2 y 18×1 frente a Nv 19 dan 1638 + 235 + 6 + 4 + 1 = 1884, lo mismo que la tarjeta. Con #R02YUVC0J: 1×50, 6×211 y 7×39 frente a Nv 12 dan 550 + 1266 + 195 = 2011.
- La fila Muros de Categorías sigue con chevron y abre este detalle. Antes abría una pantalla con la tarjeta y nada más.

Tocar un ítem abre la **ficha** (`.sheet.sheet--half`): `.thumb--96`, nombre, badges de estado, `Nv 12 / 18`, máximo del TH actual y del siguiente, ID en `.badge-id` y, si es `faltante`, el texto `Sin imagen oficial en el Fan Kit`.

#### 7b.2 Pestaña Equipamiento (rejilla densa, 40+ piezas)

**Regla**: se muestran **todas** las entradas de `equipment` de la exportación, sin deduplicar, sin filtrar nivel 1 y sin omitir las sin identificar. Recuento del 07/10: C1 **43** · C2 **39** · TH13: #GUQUV98JG 38, #GVG9GCYUV 38, #R02YVYLJ8 38, #GJPJP9JP0 35 · TH11: #GVPU80R80 33, #GVUQ2C2VC 35, #GVVYVU802 33, #GVPU2CJR8 33, #R02YUVC0J 33.

**Cabecera** (`.card`):
- `Equipamiento` (t-headline) y a la derecha **`43 piezas`** (`.t-headline .num`), el contador grande y siempre visible.
- Footnote c-2: `34 con imagen · 1 sin imagen · 8 sin identificar · 13 en nivel 1` (ejemplo del manifiesto v1; con el v1.2, C1 tiene 5 sin identificar en Equipamiento).
- `.prog` con el % de la categoría y la nota `El % no cuenta piezas en nivel 1 ni sin identificar`, la misma regla de `summarize()`.

**Grupos por héroe**: el campo `heroe` del manifiesto permite agruparlas. Los grupos siguen el orden del juego: Rey Bárbaro (8) · Reina Arquera (7) · Gran Centinela (7) · Luchadora real (7) · Príncipe Esbirro (6) · Duque Dragón (solo si hay piezas con ese `heroe`). Las piezas con `heroe: null` van a un último grupo **"Héroe sin identificar"**: en la v1 son las 8 sin identificar; en la v1.1, Fire Heart, Rocket Backpack y Electro Fangs pasan a `id_deducido` y van al grupo de su héroe si el manifiesto trae `heroe` (si no, se quedan en el último grupo con su nombre y badge), y quedan 5 sin identificar (90000016, 90000056, 90000057, 90000060, 90000061), que siguen contando en el total de piezas. Cada grupo es una `.card` con:
- Cabecera: `.thumb` de 28 px del héroe + nombre (t-subhead 600) + `8 piezas` a la derecha (footnote `.num` c-2). El grupo final no lleva miniatura.
- Orden dentro del grupo: identificadas (`ok`, `id_deducido`, `faltante`) por nivel descendente y, a igual nivel, por ID. Las **`sin_identificar` siempre al final de su grupo**.

```html
<section class="card eq-group" aria-labelledby="g-bk">
  <header class="eq-group__hdr">
    <span class="thumb" style="--size:28px"><img src="./images/heroes/barbarian-king.png" alt="" width="28" height="28" loading="lazy" decoding="async"></span>
    <h3 id="g-bk">Rey Bárbaro</h3><span class="num">8 piezas</span>
  </header>
  <ul class="eq-grid">
    <li><button class="eq" aria-label="Marioneta Bárbara, nivel 12">
      <span class="thumb thumb--52"><img src="./images/hero-equipment/barbarian-puppet.png" alt="" width="52" height="52" loading="lazy" decoding="async"></span>
      <span class="eq__lvl num">12</span></button></li>
    <!-- … -->
    <li><button class="eq is-unknown" aria-label="Sin identificar, ID 90000016, nivel 17">
      <span class="thumb thumb--52 thumb--unknown" aria-hidden="true">?</span>
      <span class="eq__lvl num">17</span><span class="eq__cap">sin identificar</span></button></li>
  </ul>
</section>
```

```css
.eq-group { padding: var(--sp-3); }
.eq-group + .eq-group { margin-top: var(--sp-2); }
.eq-group__hdr { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.eq-group__hdr h3 { flex: 1; margin: 0; font: 600 0.882rem/1.333 var(--font); }
.eq-group__hdr .num { font-size: 0.765rem; color: var(--label-2); }
.eq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));   /* 6 columnas en 393 px, 5 en 375 */
  gap: 12px 4px;                             /* 6×52 + 5×4 = 332 ≤ 337 (con 6 px solo cabían 5) */
  margin: 0; padding: 0; list-style: none;
}
.eq {
  position: relative;
  display: grid; justify-items: center; gap: 2px;
  width: 100%; min-height: 52px; padding: 0;
  border: 0; background: none; color: inherit;
}
.eq:active .thumb { opacity: 0.7; }
.eq__lvl {                                  /* nivel encima de la miniatura, esquina superior derecha */
  position: absolute; top: -5px; right: max(-2px, calc(50% - 26px - 6px));
  min-width: 20px; height: 18px; padding: 0 5px;
  border-radius: var(--r-pill);
  background: var(--bg-2); color: var(--label);
  box-shadow: 0 0 0 1px var(--separator), 0 1px 2px rgba(0, 0, 0, 0.12);
  font: 700 11px/18px var(--font); text-align: center; letter-spacing: 0;
}
.eq.is-lvl1 .eq__lvl { color: var(--label-2); font-weight: 500; }             /* sin mejorar */
.eq.is-max  .eq__lvl { background: color-mix(in srgb, var(--green) 16%, var(--bg-2)); color: var(--green-text); box-shadow: 0 0 0 1px var(--green); }  /* máx del TH; opaco porque pisa la miniatura */
.eq__cap {                                   /* solo en sin identificar: etiqueta visible */
  max-width: 60px;
  font: 400 10px/12px var(--font); color: var(--label-2); font-style: italic;
  text-align: center;
}
.eq__cap--soft { color: var(--tint); font-style: normal; }   /* "ID deducido" bajo la miniatura */
```

- Medidas: en 393 px el ancho útil es 393 − 32 de márgenes − 24 de padding = 337, así que caben **6 columnas** de 52 con hueco horizontal de 4 px (332 px). En 375 px caben 5.
- C1, con 43 piezas, ocupa unas 11 filas de rejilla más 6 cabeceras, ≈ 900 px: dos pantallas, con el contador siempre visible en la cabecera.
- Cada celda es un `<button>` de 52×52 como mínimo (objetivo táctil ≥ 44) y al tocarla se abre la ficha (§7b.1) con nombre, nivel, máximo de TH, rareza traducida (`Common` → Común, `Epic` → Épica), héroe e ID.
- Las piezas `sin_identificar` llevan la etiqueta visible "sin identificar" bajo la miniatura (2 líneas de 10 px, cursiva) y su nivel en el badge. **No se omite ninguna.**
- Las piezas `id_deducido` (v1.1) llevan su nombre y «ID deducido» en el `aria-label`, como las filas (§9), además de su imagen o iniciales y la etiqueta `.eq__cap.eq__cap--soft` "ID deducido" bajo la miniatura.
- Estados de la miniatura: los de §5.4. La única `faltante` de hoy (Noble Iron, 90000047) va con iniciales "NI".
- `aria-label` de cada celda: "<nombre>, nivel N de M; si el nivel supera el máximo, "nivel N, máximo desactualizado"" (+ ", ID deducido"). Sin máximo, "<nombre>, nivel N" (+ ", ID deducido"). O "Sin identificar, ID X, nivel N".

**Estados**: sin cuentas importadas, `.empty` con **Importar JSON**. Si la cuenta elegida no está importada, `.empty` con "Esta cuenta aún no tiene datos" y el botón. Si la exportación no trae `equipment` (no pasa hoy), aparece "La exportación no incluye equipamiento".

### 7c. Mejoras en curso (`#/mejoras`)

**Reglas de datos** (fijas):
- Toda entrada con `timer` en `buildings`, `traps`, `units`, `spells`, `siege_machines`, `heroes`, `pets` o `equipment` es una mejora en curso. `timer` = segundos restantes **en el momento de la exportación**.
- Fin = `new Date((timestamp + timer) * 1000)`, formateado en **Europe/Madrid** (§3).
- `lvl === 0` con timer es un edificio nuevo en construcción: el texto es **`Nuevo`**, no `Nv 0 → 1`.
- Si `Date.now() ≥ fin`, el estado es **`Terminada`** y el subtítulo dice "pendiente de reimportar".
- Cola: `buildings`, `traps` y `heroes` → **Constructor**; `units`, `spells` y `siege_machines` → **Laboratorio**; `pets` → **Mascotas**. Coincide con `mejoras_constructor_n`, `mejoras_lab_n` y `mejoras_mascotas_n` del CSV.
- Los flags `extra` y `helper_recurrent` no cambian nada visual en la v1.
- Constructores (decisión del líder): **total** = suma de `cnt` de las cabañas de constructor (`buildings` con data `1000015`) de la exportación. Referencia: C1 5, C2 5 (4 + 1), R02YUVC0J 3, cada TH13 5 y los otros TH11 4. **Ocupados** = mejoras en curso en la cola Constructor (edificios, muros, trampas y héroes, confirmado por Clash). Las mejoras con `extra: true` en la cola Constructor **se descuentan siempre** de ocupados, sea cual sea el edificio (las hace el constructor de B.O.B, que no figura en `1000015`; decisión de Clash). Un `extra: true` en `units` es del laboratorio y nunca cuenta como constructor. `helper_recurrent: true` (p. ej. 1000079 en C1) **no** se descuenta mientras no se confirme, así que en C1 el aviso se mantiene. **Libres** = total − ocupados. Laboratorio, Casa de mascotas y ayudantes van en su propia línea y no cuentan como constructores. Si una cuenta no tiene `1000015` en la exportación, se muestra solo `N ocupados`, sin adivinar. Si ocupados > total (se escapa B.O.B o un constructor temporal), nunca se muestran libres negativos: se muestra `N ocupados` con `.chip--warn` `Revisar constructores` y, en la ficha, footnote c-2 `Hay más mejoras que constructores conocidos`.

**Jerarquía**: Large Title "Mejoras" + subtítulo `69 en curso · 11 cuentas` → segmented **Por fin | Por cuenta** → contenido → pie legal.

**Por fin** (por defecto):
1. **Constructores libres** (`.card`, solo si alguna cuenta tiene libres conocidos): `3 cuentas con constructores libres` (t-headline) y `.chip--account` con miniatura de TH + `1 libre`. Es lo único accionable y por eso va primero.
2. **Terminadas · pendiente de reimportar** (sección, solo si hay alguna): el trailing dice `Terminada` en `--green-text` 600.
3. Secciones por día de fin: **Hoy**, **Mañana**, `Viernes 9 oct`… (`.section-header`, fecha de Madrid). Dentro, orden ascendente por fin.

**Fila de mejora** (`.row.row--thumb40.row--upgrade`, 60 px):
```
[TB]   Torre de bombas                       en 5 d 10 h
       Nv 11 → 12 · [C1] · Constructor   mar 13/10 08:45
[SW]   Super Wizard Tower                      en 3 d 23 h
       Nuevo · [C1] · Constructor        dom 11/10 21:46
```
- Miniatura según §5.4 (las defensas sin asset van con iniciales).
- Título `t-body` con el nombre visible. Subtítulo en footnote c-2 con niveles o `Nuevo`, chip de cuenta compacto y cola.
- Trailing a la derecha en dos líneas (`.row__trail.row__trail--stack`): el restante en `t-subhead` 600 `.num` `--label` y debajo la hora de fin en footnote c-2 `.num`. La fecha y hora (`fmtFin`/`fmtWhen`, «mié 07/10 21:22») y los tamaños (`61,0 MB`) llevan espacios de no separación: nunca se parten. Los recuentos «N de M» en trailing llevan `nowrap`.
- Si falta menos de 1 h, el restante va en `--tint` (es una buena noticia). Sin rojos.
- **Dynamic Type** (contenedor `.list` ≤ 19em, cuerpo de 19 px o más, §5.3): el trailing deja de ser `flex: none` y baja a una línea propia bajo el título y el subtítulo, alineado a la izquierda con el texto. Lleva restante y hora en la misma línea (`en 1 h 7 min  jue 08/10 03:37`), que se parte si no cabe. El título baja de línea en vez de recortarse.
- **Ayudantes** (sección «Ayudantes» de Por fin): usan exactamente la misma fila (`.row.row--thumb40.row--upgrade`). Llevan miniatura según §5.4 (hoy `faltante`, iniciales `BA`), subtítulo `Ayudante · [C2] · no suma constructor` y `.row__trail.row__trail--stack` con `.t-subhead.num` (`en 10 h 38 min` o `Disponible`) y `.t-footnote.c-2.num` (hora). No hay clase propia (`.trail-time` desaparece). A tamaño normal el restante pasa de `--label-2` a `--label` y de 17 a 15 px, como en el resto de mejoras.

**Por cuenta**: una sección por cuenta en el orden fijo. La cabecera es una `.card` compacta con TH de 28 px + nombre y debajo los **slots** de cada cola:

```html
<div class="slots" role="img" aria-label="Constructores: 6 ocupados">
  <span class="slots__lbl">Constructores</span>
  <i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i>
  <span class="num">6</span>
</div>
```
```css
.slots { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 22px; font-size: 0.765rem; color: var(--label-2); }
.slots__lbl { min-width: 9.5em; }
.slots i { flex: none; width: 8px; height: 8px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--label-3); }
.slots i.on   { background: var(--label-2); box-shadow: none; }            /* ocupado: neutro */
.slots i.free { box-shadow: inset 0 0 0 1.5px var(--green-text); }        /* libre (solo con total conocido) */
.slots .num { margin-left: 4px; color: var(--label); font-weight: 600; white-space: nowrap; }  /* "6", "6/7" o "7 ocupados" */
.slots .chip { margin-left: auto; }                                         /* "Revisar constructores": baja de línea si no cabe */
/* Dynamic Type: la columna de texto de la tarjeta es el contenedor (278 px en 390; 12em ≈ cuerpo de 23,2 px o más: a 23 px aún cabe en una línea).
   La etiqueta ocupa su línea y los puntos y el recuento bajan debajo, juntos. */
.card > div:has(> .slots) { container-type: inline-size; min-width: 0; }
@container (max-width: 12em) {
  .slots { row-gap: 2px; }
  .slots__lbl { flex: 1 0 100%; min-width: 0; }
}
```
Hay tres líneas: Constructores, Laboratorio y Mascotas (esta solo si TH ≥ 14). Debajo, en footnote c-2, `Tiempos estimados desde la exportación de mié 07/10 21:22`. Luego vienen las filas de esa cuenta, ordenadas por fin.

**Actualización**: los restantes se recalculan cada 60 s y en `visibilitychange`, sin animación. Sin scroll caben la tarjeta de libres (≈ 90) y unas 7 filas.

**Estados**: sin datos, `.empty` con **Importar JSON**. Si hay datos pero ninguna mejora, `.empty` con "No hay mejoras en curso" / "Todas las colas están libres según la última importación". Cargando: 6 filas skeleton.

### 7d. Evolución (`#/evolucion`)

**Objetivo del roster: TH18 + TH17 + 9×TH15** (C1 → 18, C2 → 17, el resto → 15).

**Jerarquía**: Large Title "Evolución" → tarjeta **Objetivo** → **Escalera de TH** → gráfico **Progreso medio** → gráfico **Subidas pendientes** → pie legal.

1. **Tarjeta Objetivo** (`.card`):
   - Caption c-2: `Objetivo: TH18 + TH17 + 9×TH15`.
   - **`29 subidas de TH pendientes`** (`.t-title1 .num`). Hoy: C1 0 + C2 1 + 4 TH13 × 2 + 5 TH11 × 4 = 29.
   - `.bar--lg` con `--cat: var(--tint)` y `--p` = subidas hechas / totales, contando desde TH11: 49 posibles (C1 7, C2 6, nueve × 4). Hoy son 7 + 5 + 4 × 2 + 0 = 20, es decir, **40,8 %**. Debajo se rotula `20 de 49 subidas desde TH11`.
   - `.chip--goal-ok`: `1 de 11 en objetivo`.
2. **Escalera de TH** (`.card`): matriz de 11 filas × 7 columnas (TH12…TH18). Cada celda es una subida y las posteriores al objetivo de la cuenta no se pintan.
   ```css
   .ladder { display: grid; grid-template-columns: 4.2em repeat(7, 1fr) 3.2em; gap: 6px 3px; align-items: center; }
   .ladder__hdr  { font-size: 0.647rem; color: var(--label-2); text-align: center; font-variant-numeric: tabular-nums; }
   .ladder__name { font-size: 0.765rem; font-weight: 600; white-space: nowrap; }
   .ladder i { height: 14px; border-radius: 4px; }
   .ladder i.done      { background: var(--tint); }                        /* TH alcanzado */
   .ladder i.todo      { box-shadow: inset 0 0 0 1.5px var(--fill-1); }    /* pendiente hasta el objetivo */
   .ladder i.goal.todo { box-shadow: inset 0 0 0 1.5px var(--tint); }      /* celda del TH objetivo */
   .ladder i.goal.done { background: var(--green); }                       /* objetivo alcanzado */
   .ladder i.none      { visibility: hidden; }                             /* más allá del objetivo */
   .ladder__val { font-size: 0.765rem; text-align: right; color: var(--label-2); font-variant-numeric: tabular-nums; }
   ```
   Filas `C1`, `C2`, `13·8JG`… con valor `16/17` a la derecha y `role="img"` + `aria-label` por fila ("C2: TH16, objetivo TH17, falta 1"). En 393 px cada celda mide ≈ 30×14 y la matriz entera ≈ 240 px, visible tras la tarjeta Objetivo (≈ 150).
3. **Progreso medio** (`.card`, SVG): línea de `pct_media` por fecha de importación. Con `<select>` se elige **«Media del roster»** (texto exacto de la opción: corto a propósito, porque el `<select>` de Safari iOS no siempre respeta `text-overflow: ellipsis` y el texto largo anterior, «Roster (media de las cuentas del día)», se salía de la tarjeta) o una cuenta (`C1 Principal`, `#GUQUV98JG`…). Cuando hay datos del TH objetivo (`pct_ofensiva_vs_th15` y similares), el selector añade "Ofensiva frente al objetivo".
4. **Subidas pendientes** (`.card`, SVG): escalones descendentes del total (29 → 0) por fecha, con línea de meta discontinua en 0.

**Especificación de los gráficos SVG** (los dos iguales):

```html
<svg class="chart" viewBox="0 0 343 180" role="img" aria-label="Progreso medio del roster: 54,9 % el 07/10">
  <g class="chart__grid">
    <line x1="32" x2="335" y1="12" y2="12"/><line x1="32" x2="335" y1="48" y2="48"/>
    <line x1="32" x2="335" y1="84" y2="84"/><line x1="32" x2="335" y1="120" y2="120"/><line x1="32" x2="335" y1="156" y2="156"/>
  </g>
  <g class="chart__y"><text x="26" y="16">100</text><text x="26" y="88">50</text><text x="26" y="160">0</text></g>
  <path class="chart__area" d="M40,77 L120,74 L200,70 L280,66 L280,156 L40,156 Z"/>
  <polyline class="chart__line" points="40,77 120,74 200,70 280,66"/>
  <circle class="chart__pt" cx="280" cy="66" r="4"/>
  <g class="chart__x"><text x="40" y="174">07/10</text><text x="280" y="174">28/10</text></g>
</svg>
```
```css
.chart { width: 100%; height: auto; display: block; overflow: visible; }
.chart__grid line { stroke: var(--separator); stroke-width: 0.5; }
.chart :is(.chart__y, .chart__x) text { fill: var(--label-2); font: 400 11px/13px var(--font); font-variant-numeric: tabular-nums; }
.chart__y text { text-anchor: end; }
.chart__x text { text-anchor: middle; }
.chart__area { fill: var(--tint-soft); }
.chart__line, .chart__step { fill: none; stroke: var(--tint); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.chart__pt   { fill: var(--bg-2); stroke: var(--tint); stroke-width: 2.5; }
.chart__goal { stroke: var(--green); stroke-width: 1.5; stroke-dasharray: 4 4; }
.chart-wrap { position: relative; }        /* .card que contiene el SVG: ancla del callout */
.chart-select {
  appearance: none; -webkit-appearance: none; border: 0; background: none; color: var(--tint);
  font: 400 0.882rem/1.333 var(--font); text-align: right;
  flex: 0 1 auto; min-width: 0; max-width: 55%;
  padding: 12px 0; margin: -12px 0;   /* 44 px de alto táctil sin mover nada */
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;   /* red de seguridad: el arreglo real es el texto corto */
}
.card__top--chart { flex-wrap: wrap; row-gap: var(--sp-1); }
.card__top--chart > :first-child { flex: none; white-space: nowrap; }        /* "Progreso medio" en una línea */
.chart-wrap { container-type: inline-size; }                                 /* contenedor = contenido de la tarjeta (326 px en 390) */
@container (max-width: 17em) {                                               /* cuerpo de unos 19 px o más */
  .card__top--chart { flex-direction: column; align-items: flex-start; }
  .card__top--chart .chart-select { max-width: 100%; text-align: left; }
}
.chart-callout { position: absolute; padding: 6px 10px; border-radius: 8px; font: 600 13px/18px var(--font); font-variant-numeric: tabular-nums; } /* + .material-float */
```
- Área de trazado: x 32–335, y 12–156 (0 % abajo). Eje Y de 0 a 100 % (o de 0 a 29). Como mucho 5 rótulos en X (primera fecha, última y hasta 3 intermedias).
- Al tocar un punto aparece un `.chart-callout` encima: `07/10 · 54,9 %`.
- Debajo del gráfico va una tabla `.sr-only` con los mismos datos.
- La tarjeta del gráfico es `.card.chart-wrap` (el callout se posiciona respecto a ella; `container-type` la mantiene como bloque contenedor). Su cabecera es `.card__top.card__top--chart`, con `<p class="t-headline">Progreso medio</p>` primero y el `<select class="chart-select">` después. A tamaño normal van en una línea: el título no se parte y el select (máx. 55 %) queda a la derecha. Con cuerpo de 19 px o más, el select baja debajo del título y se alinea a la izquierda.

**Estados**: con **una sola importación** (lo que hay hoy: una fila por cuenta del 07/10 en `snapshots.csv`) los gráficos muestran el punto único con su valor y el `.section-footer` "Hace falta una segunda importación para ver la tendencia". La tarjeta Objetivo y la Escalera ya funcionan con un snapshot. Sin datos: `.empty`.

### 7e. Ajustes (sheet desde la nav de Roster)

Sheet a pantalla completa (§5.13) con el título "Ajustes" y **OK** (`.btn-text--bold`) a la derecha. Contenido en listas agrupadas:

**DATOS**
- Fila `Importar JSON` (chevron) → abre el sheet de importación (§8).
- Fila informativa `Cuentas importadas`, con `11 de 11 · última mié 07/10 21:26` a la derecha.
- Fila `Borrar todos los datos` en `--red-text`, que pide alerta: "¿Borrar todos los datos?" / "Se eliminarán las importaciones y el histórico de este iPhone." / Cancelar · **Borrar** (destructivo).
- Fila `Restaurar datos incluidos`, que pide alerta: "¿Restaurar datos incluidos?" / "Se volverán a cargar las 11 exportaciones del 7 oct 2026. Las importaciones más nuevas se conservan." / Cancelar · Restaurar.
- Las alertas siguen §5.12: el foco va a Cancelar, Esc cancela y el foco vuelve a la fila.

**IMÁGENES SIN CONEXIÓN** (`.card.offline-dl`)

```
Imágenes sin conexión                                     14 de 130
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
9,6 MB de ~41 MB guardados
[        Descargar todas (~40 MB)        ]        ← .btn--primary.btn--block
Los ayuntamientos y los héroes ya están guardados. El resto de imágenes se
guarda al verlas por primera vez. Recomendado con wifi.
```

```css
.offline-dl__top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--sp-2); }
.offline-dl__top h3 { margin: 0; font: 600 1rem/1.294 var(--font); }
.offline-dl .bar { --cat: var(--tint); margin-bottom: 6px; }
.offline-dl__meta { font-size: 0.765rem; line-height: 1.385; color: var(--label-2); font-variant-numeric: tabular-nums; margin-bottom: var(--sp-3); }
.offline-dl.is-done .bar { --cat: var(--green); }
.offline-dl__status[aria-live] { min-height: 1.385em; }
```

| Estado | Barra | Texto | Botón |
|---|---|---|---|
| Parcial (tras instalar) | `--p` = MB guardados / total | `9,6 MB de ~41 MB guardados` | **Descargar todas (~40 MB)** (primario) |
| Descargando | avanza (sin transición si se reduce el movimiento) | `Descargando 57 de 130 · 23,4 de ~41 MB` (texto visible sin `aria-live`; los anuncios van aparte, ver abajo) | **Detener** (secundario) |
| Completa | verde, 100 % | `Las 130 imágenes están disponibles sin conexión` en `--green-text` | `Borrar imágenes guardadas` (`.btn--destructive`, con alerta) |
| Con errores | se queda donde iba | `No se pudieron descargar 3 imágenes` | **Reintentar** (secundario) |
| Sin conexión | sin cambio | `Sin conexión. Conéctate para descargar.` | deshabilitado |
| Sin espacio | sin cambio | `No hay espacio suficiente en el iPhone` | **Reintentar** |

- Tamaño: los 130 PNG suman 41,3 MB. Precacheados al instalar: 8 ayuntamientos (8,6 MB) + 6 héroes (1,0 MB). El botón dice "~40 MB" (lo que decidió el líder) y el contador usa bytes reales. Los bytes salen del manifiesto (`bytes` de cada imagen y el bloque `peso_imagenes`: 41 314 444 bytes en total y 9 624 126 precacheados en la v1).
- Si existe, se llama a `navigator.storage.persist()` antes de descargar.
- **Durante la descarga no se redibuja el sheet.**
  - Cada 4 imágenes, `patchOfflineDl()` cambia solo el recuento `N de M`, `--p` y el `aria-label` de la barra, y el texto de estado.
  - El sheet no se reanima y no pierde el scroll. El foco sigue en «Detener», que se ve entero (SE a 28 px incluido).
  - Solo hay `render()` al cambiar de fase: empezar, detener, terminar, error o sin espacio. En ese redibujado se aplica §5.13.
- **Anuncios.**
  - Una única región viva `#announcer` (`.sr-only`, `aria-live="polite"`) va fuera de `#app`, así que ningún `render()` la sustituye. Se crea al arrancar.
  - Durante la descarga solo anuncia `Imágenes sin conexión: 25 %`, `50 %` y `75 %` (por bytes, una vez cada uno).
  - Al acabar anuncia el estado final: `Las 130 imágenes están disponibles sin conexión`, `Descarga detenida. 9,6 MB de ~41 MB guardados`, `No se pudieron descargar 3 imágenes` o `No hay espacio suficiente en el iPhone`.
  - VoiceOver no vuelve a leer la tarjeta en cada actualización.

**ACERCA DE**
- `Versión` con `1.0.0 (abc1234)` a la derecha.
- **Aviso de Supercell completo** (`.card`, t-footnote, texto `--label`):
  - En inglés literal (`lang="en"`): *This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.*
  - En español: "Material no oficial, no respaldado por Supercell. Las imágenes son del Supercell Fan Kit y se muestran sin modificar. Esta app es gratuita, privada y sin fines comerciales."
  - Enlace `.btn--plain`: `Leer la Fan Content Policy` → https://supercell.com/en/fan-content-policy/
  - Footnote c-2: `Política consultada el 07/10/2026 (versión del 27/09/2023).`
- El pie legal (§5.14) también va al final del sheet.

---

## 8. Importar exportaciones (`#/importar`, sheet)

> Sustituye a la antigua «Importación de JSON». Parte de lo que hace hoy el PR #1 (`2d2ffaa`, `renderImport` · `reviewImport` · `commitImport` en `js/app.js`): un sheet con `Pegar | Archivo`, una textarea, «Pegar del portapapeles», «Revisar», tarjetas de revisión e «Importar N cuentas». Se queda el esqueleto y cambian el orden de los pasos, los textos y los casos de error.
> **Entrega (decisión del líder, 7 oct 2026)**: PR propio **después** del de imágenes v1.2. Los arreglos de `.toast` (`width: max-content`, §5.12) y de `parseLoose` (§8.5) **no esperan**: entran en el PR de imágenes v1.2.
> Maqueta: `maqueta/importar.html` (14 pantallas, `tools/build_importar.py`). Capturas a 393×852 con DPR 2 en `capturas/importar/`.
> **Simulación en la maqueta**: hay una sola exportación real por cuenta (07/10). Para enseñar «cambios desde el último punto» y el lote, la maqueta proyecta cada exportación real al **vie 09/10 18:00** aplicando solo los temporizadores reales que ya habrían terminado. No se inventa ninguna mejora y los % salen de `roster_snapshot.build_row` (máximos de `caps_clashrecord.json`). El tag `#QL0Y2P8CU` del caso «cuenta nueva» es ficticio.

### 8.1 De dónde sale el JSON (verificado)

- El juego copia la exportación **al portapapeles**, no genera archivo: *Settings → More Settings → Data Export → Copy* (verificado en clash.ninja y clashprogress.com). **Los nombres de esos menús en español están sin confirmar**; mientras tanto la UI dice `Ajustes → Más ajustes → Exportar datos → Copiar`.
- Solo existe un `.json` si lo guarda Miguel o un Atajo (§8.7, aplazado).
- **La exportación no trae el nombre del jugador.** Claves vistas en las 22 del 07/10 (recortadas y originales): `tag`, `timestamp`, `helpers`, `guardians`, `buildings`, `traps`, `units`, `siege_machines`, `heroes`, `spells`, `pets`, `equipment`, `heroes2`, `units2`, `boosts` y `_note`. Por eso la app nunca muestra un nombre de jugador: solo el tag y, si Miguel lo pone, un alias.
- Formato (verificado con las 11 del 07/10): un objeto con `tag` (`#…`), `timestamp` (epoch en segundos) y `buildings[]` con `{data: 1000001, lvl: <TH>}`. Opcionales: `traps`, `units`, `siege_machines`, `heroes`, `spells`, `pets`, `equipment`, `heroes2`, `units2`, `helpers`, `guardians` y `boosts`. Las claves extra (`_note`, `decos`, `buildings2`…) se ignoran sin error.
- Cada importación es un punto `[tag, timestamp]`, la misma clave del almacén IndexedDB de `js/store.js`. Por eso «duplicado» significa mismo tag y mismo `timestamp`.

### 8.2 Estructura del sheet

- **Entradas**: «Importar» en la nav de Roster, **Importar JSON** en los estados vacíos y Ajustes → Importar JSON. Se abre el sheet de §5.13 con `Cancelar` · **Importar** · (vacío).
- **Segmented** `Pegar | Archivos` (antes «Archivo»; va en plural porque admite varios). Sale en los estados de entrada y de error, y se oculta en Validando, Vista previa y Lote.
- **Un solo botón primario**, abajo, y siempre es el siguiente paso. Si hace falta una salida alternativa, va debajo un `.btn--plain.btn--block`. La textarea ya no es el centro: el JSON en bruto no le dice nada a Miguel. «Pegar» lee el portapapeles y **valida en el acto**, sin paso «Revisar».
- Pie legal (§5.14) al final de `.sheet__body` en todos los estados.

### 8.3 Pantallas y estados

| # | Estado | Contenido | Primario | Secundario |
|---|---|---|---|---|
| 1 | **Vacío · Pegar** | Seg. Lista «Cómo copiar la exportación» (3 filas). Sección «O pega el texto a mano» con textarea corta. Footer «Los datos se guardan solo en este iPhone.» | **Pegar** | |
| 1b | Vacío con texto escrito a mano | Igual, con el texto en la textarea | **Revisar** | |
| 2 | **Vacío · en Safari** (no instalada) | Igual que 1, con la tarjeta «Estás en Safari» encima del seg. Condición: `navigator.standalone === false` (propiedad que solo existe en iOS) | **Pegar** | |
| 3 | **Vacío · Archivos** | Seg. Tarjeta «Desde Archivos». La lista «Con un Atajo de iOS» queda **fuera** mientras el Atajo esté aplazado | **Elegir archivos…** | |
| 4 | **Atajo** (pantalla dentro del sheet) · **APLAZADA** | **Aplazada el 7 oct 2026** hasta que Miguel pruebe el Atajo en su iPhone. No se implementa en este PR; el diseño se guarda aquí y en la maqueta (`#/atajo`, con la marca «Aplazada»). Lead `‹ Importar`, título «Atajo», acciones en orden y cómo lanzarlo (§8.7) | **Elegir archivos…** | |
| 5 | **Validando** | **Solo si la validación no ha terminado 150 ms después** de tener el texto: tras resolverse `readText()` (Pegar), al tocar Revisar con texto pegado a mano o al elegir archivos (temporizador, regla de §5.11). **Nunca mientras el sistema espera al usuario**: en iPhone, `readText()` no se resuelve hasta que se toca el globo «Pegar» de iOS, y durante esa espera la hoja sigue en su estado anterior. Si termina antes, se pasa directo a la vista previa, al error o al lote **sin pintar Validando: nunca un destello**. Tarjeta con `.sk` (miniatura de 96 y 3 líneas), `aria-busy="true"` | **Validando…** (deshabilitado) | |
| 6 | **Vista previa** (1 cuenta, **solo desde Pegar**) | Tarjeta `.preview` + `dl.kv`; sección «Cambios» con la lista de §8.5 | **Importar** | Pegar otra |
| 7 | **Lote** (desde Archivos, **uno o varios** archivos) | Resumen `12 archivos · 11 listos · 1 omitido` (con uno: `1 archivo · 1 listo`); grupos «Listos para importar» y «Se omiten» con filas `.row--thumb44` | **Importar 11 cuentas** (con uno: **Importar 1 cuenta**) | |
| 8 | **Éxito** | Se cierra el sheet y vuelve a Roster con toast `.toast--ok`; la tarjeta o fila afectada lleva `.is-flash` 1,2 s | | |
| 9 | **Error · no se puede leer** | Seg + tarjeta de error (variantes en §8.4) | **Pegar de nuevo** (en Archivos: **Elegir otros archivos**) | |
| 10 | **Tag desconocido** | Tarjeta con el tag como título, TH y fecha, más el aviso. **No se importa sin más** | **Añadir como cuenta nueva…** | Pegar otra |
| 10b | **Confirmar cuenta nueva** (pantalla dentro del sheet) | Lead `‹ Importar`, título «Cuenta nueva». Datos de la exportación, alias editable y objetivo (§8.4) | **Añadir cuenta** | (volver con `‹ Importar`) |
| 11 | **Más antigua que la guardada** | Tarjeta de vista previa + aviso, sin lista de cambios | **Añadir al histórico** | Pegar otra |
| 12 | **Duplicado** (misma cuenta y mismo `timestamp`) | Tarjeta de vista previa + info; se descarta | **Pegar otra** | |
| 14 | **Éxito · cuenta nueva** | Roster desplazado hasta «Otras cuentas», con la fila nueva en `.is-flash` y el toast | | |
| 13 | Error al guardar | El sheet sigue abierto; `.msg-err` encima del botón en `.sheet__actions` | **Reintentar** | |

**Archivos siempre abre el lote** (decisión del 8 oct 2026, 1.1.2): elegir **un solo archivo** abre el lote `1 archivo · 1 listo` (o `1 archivo · 1 cuenta nueva`, `1 archivo · 0 listos · 1 no válido`…), **nunca** la vista previa suelta con «Pegar otra», que en 1.1.1 llevaba a la pestaña Pegar sin venir de ella. La vista previa de esa cuenta se abre tocando su fila (lead `‹ Importar`). Los estados 6, 10, 11 y 12 con «Pegar otra» y el 9 con «Pegar de nuevo» son del flujo Pegar; desde Archivos esos casos son filas del lote.

En el **lote**, cada archivo pasa por las mismas reglas y la fila dice en palabras en qué caso está (§8.4). Si dos archivos traen la misma cuenta, el más nuevo actualiza y el resto va como «Más antigua» al histórico; dos con el mismo `timestamp` cuentan una sola vez y el otro sale como «Duplicada». El orden de las filas es el fijo del Roster (C1, C2, TH13, TH11), con los tags ajenos al final. Opcional: al tocar una fila se abre la vista previa de esa cuenta dentro del sheet, con lead `‹ Importar`.

### 8.4 Textos exactos

**Vacío · Pegar**
- Cabecera de sección: `Cómo copiar la exportación` (`.section-header`, sale en mayúsculas)
- Filas `div.row` dentro de `div.list` (título / subtítulo). Así la fila «Cómo crear el Atajo» puede ser un `a.row` hermano y conserva el separador (§5.3):
  - `1. En Clash of Clans` / `Entra en la cuenta que quieras importar.`
  - `2. Ajustes → Más ajustes` / `En Exportar datos, toca Copiar.`
  - `3. Vuelve aquí y toca Pegar` / `Verás la cuenta antes de guardar nada.`
- Cabecera: `O pega el texto a mano`. Placeholder de la textarea: `Mantén pulsado aquí y elige Pegar`. `aria-label="Texto de la exportación"`.
- Footer: `Los datos se guardan solo en este iPhone.`

**Aviso en Safari** (`.card`; t-headline + t-subhead c-2)
- `Estás en Safari`
- `Lo que importes aquí se queda en Safari. La app de la pantalla de inicio guarda sus datos aparte: si la tienes instalada, ábrela desde su icono e importa allí.`

**Vacío · Archivos**
- Cabecera `Desde Archivos`. Tarjeta: `Elige uno o varios archivos .json, por ejemplo desde iCloud Drive. Puedes elegir todas tus cuentas a la vez.` Footer: `Las exportaciones que ya están guardadas se omiten solas.`
- **Aplazado** (vuelve con el Atajo): cabecera `Con un Atajo de iOS`, con la tarjeta de antes `…por ejemplo los que guarda el Atajo en iCloud Drive…`. Filas:
  - `1. Copia en el juego` / `Ajustes → Más ajustes → Exportar datos → Copiar.`
  - `2. Ejecuta el Atajo` / `Guarda lo copiado como archivo. Repite con cada cuenta.`
  - `3. Elige los archivos aquí` / `Con «Elegir archivos…», abajo.`
  - `Cómo crear el Atajo` (fila con chevron, abre la pantalla 4)

**Pantalla Atajo** (**aplazada**, 7 oct 2026; textos guardados para cuando vuelva)
- Intro: `El Atajo guarda cada exportación copiada como un archivo .json. Después las importas todas a la vez desde Archivos.`
- Cabecera `Acciones, en este orden` y filas: ver §8.7. Footer: `Los nombres de las acciones pueden variar un poco según la versión de iOS.`
- Cabecera `Para lanzarlo sin salir del juego`. Filas: `Toque atrás` / `Ajustes → Accesibilidad → Tocar → Toque atrás.` · `Botón de Acción` / `En los iPhone que lo tienen.`
- Footer: `El Atajo no puede abrir esta app ni pasarle datos directamente: se entienden a través de los archivos.`

**Validando** (solo si vence el temporizador de 150 ms, §8.3): botón `Validando…` y `role="status"` oculto: `Validando la exportación`.

**Vista previa** (ejemplo de la maqueta, C2 con la simulación del vie 09/10 18:00):
```
┌──────┐  C2 Secundaria  [Secundaria]
│ TH16 │  #R00C8CPQC · TH16 → objetivo TH17
│ 96px │  Datos del vie 09/10 18:00
└──────┘
────────────────────────────────────────────
Último punto        mié 07/10 21:23
Media               48,8 % → 48,9 %  +0,1
Mejoras en curso    8 → 5
Próxima             sáb 10/10 19:30
Equipamiento        39 piezas
● 4 ítems sin identificar: se guardan igual.

CAMBIOS                                        3
[img] Consejo heroico   Nv 9 → 10 · Ejército
[img] Bárbaro           Nv 9 → 10 · Laboratorio
[img] Reina Arquera     Nv 29 → 30 · Héroes
Al importar se añade un punto a Evolución.
```
- Título, línea del tag y línea de fecha van en tres bloques (`div`) dentro de `.preview__main`, separados por su `gap: 2px`; nada de `<p>` con margen ni de `<span>` en línea.
- Fila **Media** (§8.5): si cambia, `48,8 % → 48,9 %` y la `.delta` (`+0,1`); si no cambia, `49,0 % · sin cambio`, **sin flecha ni valor repetido**. A 17 px la línea con cambio puede ocupar dos líneas en el `dd`: la `.delta` baja entera (`nowrap`), nunca se separa el signo de la cifra.
- Línea de fecha: `Datos del <fmtFin>` (hora de Madrid, §3). El título es el alias del Roster (`C1 Principal`, `C2 Secundaria`) o el tag en `.tag`. La línea del tag lleva `→ objetivo THn` solo si el objetivo es mayor que el TH.
- Variantes: `Primera exportación de esta cuenta en este iPhone.` (`.section-footer`, sin «Último punto» ni lista) · `Sin cambios desde el último punto. Se añadirá igualmente un punto a Evolución.` (en lugar de la lista) · si sube de TH, la primera fila `dt` es `Ayuntamiento` con `TH16 → TH17`, y si la media baja va la footnote `La media se compara ahora con los máximos de TH17.`
- La lista «Cambios» va en su propia `.section` (cabecera + `.list` + footer), con el margen de sección del sheet, no pegada a la tarjeta (1.1.1). Si solo cambia el TH y no hay cambios de ítems, no hay sección «Cambios»: solo el footer `Al importar se añade un punto a Evolución.`
- Cabecera de la lista: `Cambios` con el número a la derecha (`.num`). La referencia ya está en la fila `Último punto`; con un título largo y texto grande, el número quedaba en mitad de la frase.
- `role="status"` oculto: `Exportación de C2 Secundaria lista para importar`.

**Lote**
- Resumen (t-subhead): `13 archivos · 11 listos · 1 cuenta nueva · 1 duplicada`. Variantes: `1 archivo · 1 listo`, `… · 2 cuentas nuevas`, `… · 1 no válido`.
- Cabeceras: `Listos para importar`, `Cuenta nueva` (o `Cuentas nuevas`) y `Se omiten`, con el número a la derecha (`.num`).
- Fila de cuenta nueva: `a.row`/`button.row` con chevron, título = tag (`.tag`), subtítulo `TH16 · datos del mié 07/10 21:23` y trailing `Añadir…`. Al tocarla se abre la pantalla 10b. Footer: `No es una de tus cuentas. Tócala si quieres añadirla; si no, no se importa.`
- Subtítulo de fila: `TH16 · datos del vie 09/10 18:00`.
- Trailing en palabras: `+3 niveles` · `+1 nivel` · `Sin cambios` (también se importa y añade punto) · `Primera` · `Más antigua` (`--orange-text`, va al histórico) | en «Se omiten»: `Duplicada` · `No válido` (`--red-text`).
- Fila de archivo no válido (no hay tag que mostrar): título `No válido`, subtítulo `<archivo> · <motivo>`, **sin trailing** (para no repetir «No válido»), también `.row--account`. El motivo es **solo el primero**, sin punto final: `c1.json · El archivo está incompleto` · `vacio.json · El archivo está vacío` · `roto.json · El archivo no es una exportación válida` · `foo.json · Falta el tag de la cuenta`. Si el texto no empieza por `{`, el motivo es `Empieza por «muestra»` con la muestra de la tabla de errores, en texto normal y sin `.tag`: `nota.txt · Empieza por «https://link.cla…»`. Entre el nombre y el `·` va un espacio sin separación (U+00A0), así que el `·` nunca empieza línea. La lista completa de motivos sigue en la tarjeta de error del flujo Pegar (`No es una exportación de Clash of Clans`, uno por línea); en el lote esta fila no se abre (1.1.3, §8.12).
- Footer de «Se omiten»: `Misma cuenta y misma hora que una ya guardada.` si hay alguna `Duplicada`. Las filas `No válido` **no** llevan footer, porque ya dicen su motivo (desde 1.1.3; en 1.1.2 salía `No es una exportación válida.`, que lo repetía y no era exacto con «vacío» o «incompleto»). Solo si una fila no válida se quedara sin motivo volvería `No es una exportación válida.`
- Primario: `Importar 11 cuentas` · `Importar 1 cuenta`. Las cuentas nuevas no entran en ese número: se añaden una a una desde su fila. Si no queda ninguna lista: `Elegir otros archivos`.

**Errores al leer** (tarjeta: t-headline + `.msg.msg-err` + t-footnote c-2)

| Caso | Título | Mensaje | Ayuda |
|---|---|---|---|
| Portapapeles vacío o sin texto (`readText()` devuelve `""`) | `No hay nada que pegar` | `El portapapeles está vacío.` | `Copia la exportación en el juego y vuelve a tocar Pegar.` |
| No se confirmó el globo «Pegar» (`readText()` rechaza) | `No se ha pegado nada` | `iOS necesita que confirmes el pegado.` | `Al tocar Pegar aparece un globo «Pegar» encima del botón: tócalo. También puedes mantener pulsado el cuadro de texto.` |
| Texto cortado: empieza por `{` y no cierra, o el error de parseo es de fin de texto | `No se pudo leer la exportación` | `El texto está incompleto: parece cortado al copiar.` | `Vuelve a Clash of Clans y toca Copiar otra vez en Exportar datos.` |
| Otro texto (no empieza por `{`) | `No se pudo leer la exportación` | `Lo que hay en el portapapeles no es una exportación. Empieza por «https://link.cla…».` (en `.tag`; hasta 20 caracteres, tal cual; si hay más, los 16 primeros sin espacios al final y `…`) | igual |
| Empieza por `{` y termina en `}`, pero no se puede leer | `No se pudo leer la exportación` | `El texto no es una exportación válida.` | igual |
| JSON válido que no es una exportación | `No es una exportación de Clash of Clans` | `Falta el tag de la cuenta.` · `Falta la fecha de exportación.` · `No se encuentra el ayuntamiento.` (uno por línea) | igual |
| Archivo ilegible (lote) | fila en «Se omiten» con `No válido`, subtítulo `<archivo> · <primer motivo>` («Lote», arriba) | | |

- **«Empieza por «…».»: el final va pegado.** Todo el mensaje va en el único `<span>` de `.msg` (§8.6) y la muestra en `.tag`. El último carácter de la muestra, el `»` y el `.` van juntos en un `span.nowrap`: con la muestra `https://link.clashof` (20 caracteres): `Empieza por «<span class="tag">https://link.clasho</span><span class="nowrap"><span class="tag">f</span>».</span>`. Un `&nbsp;` no basta: no hay espacio que sustituir y `overflow-wrap: anywhere` corta entre cualquier par de caracteres. Así la línea puede partirse dentro de la muestra, pero nunca deja `.`, `»` ni `».` solos (en 1.1.1 el `.` quedaba solo en otra línea a 28 px; probado con 7 muestras de 17 a 32 px, sin huérfanos ni desborde).
- **Textos al leer un archivo** (`parseLoose(text, "file")`, en la app desde 1.1.0): vacío → `No hay nada que leer` / `El archivo está vacío.` / `Elige otra exportación JSON.` · no empieza por `{` → `El archivo no es una exportación. Empieza por «…».` · cortado → `El archivo está incompleto.` · no se puede leer → `El archivo no es una exportación válida.`. Título `No se pudo leer la exportación` y ayuda `Elige el JSON que exporta Clash of Clans.` en los tres últimos. En 1.1.1 salen en la tarjeta de error al elegir un solo archivo; con «Archivos siempre abre el lote» (§8.3) ese archivo pasa a ser una fila «No válido», con el motivo en el subtítulo (§8.11.7 y §8.12).

**Casos de la cuenta**
- Tag desconocido: `.msg-warn` `#QL0Y2P8CU no es una de tus cuentas.` + footnote `Si es una cuenta tuya nueva, añádela. Si copiaste desde otra cuenta por error, cambia de cuenta en el juego y vuelve a copiar.` Subtítulo de la tarjeta: `TH16 · sin objetivo`. Primario `Añadir como cuenta nueva…` (los puntos suspensivos indican que pide confirmación) y `.btn--plain` `Pegar otra`. «Importar igualmente» desaparece.
  - Texto con 11 cuentas fijas: «tus cuentas» y no «tus 11 cuentas», porque puede haber una 12.ª.

**Confirmar cuenta nueva** (pantalla 10b, dentro del mismo sheet)

Va dentro del sheet y no en una alerta: lleva un campo de texto, y el `.alert` del sistema (§5.12) no tiene campos. Según la HIG, **añadir no es destructivo**: el primario es un `.btn--primary` normal y la cancelación es volver con `‹ Importar` (o `Cancelar` arriba, que cierra todo sin guardar). Lo destructivo es quitar la cuenta, más tarde, en Ajustes.

```
‹ Importar            Cuenta nueva
┌──────┐  #QL0Y2P8CU
│ TH16 │  TH16 · datos del mié 07/10 21:23
└──────┘
DATOS DE LA EXPORTACIÓN
Tag                       #QL0Y2P8CU
Ayuntamiento              TH16
Datos del                 mié 07/10 21:23
La exportación no incluye el nombre del jugador.
EN ESTA APP
Alias                     [#QL0Y2P8CU          ]   ← placeholder = tag
Objetivo                  Sin objetivo
Opcional. Si lo dejas vacío se muestra el tag, como en las demás cuentas.
Aparecerá en Roster después de tus 11 cuentas, en «Otras cuentas». El
objetivo TH18 + TH17 + 9×TH15 no cambia.
[              Añadir cuenta              ]
```

- Cabeceras: `Datos de la exportación` y `En esta app`.
- Filas (`.row`, valor en `.row__trail`): `Tag` / `#QL0Y2P8CU` (`.tag`) · `Ayuntamiento` / `TH16` · `Datos del` / `mié 07/10 21:23` (hora de Madrid).
- Footer 1: `La exportación no incluye el nombre del jugador.`
- Fila `Alias` con `<input class="row__input" maxlength="24" autocapitalize="words" autocorrect="off" enterkeyhint="done">`. Placeholder: el tag. Se recortan los espacios; vacío = se muestra el tag. Fila `Objetivo` / `Sin objetivo` (solo lectura).
- Footer 2: `Opcional. Si lo dejas vacío se muestra el tag, como en las demás cuentas.`
- Footer 3: `Aparecerá en Roster después de tus 11 cuentas, en «Otras cuentas». El objetivo TH18 + TH17 + 9×TH15 no cambia.`
- Primario: `Añadir cuenta`. Al pulsarlo se guarda la cuenta, se importa esta exportación como su primer punto y se cierra el sheet.
- Toast: `Cuenta añadida: #QL0Y2P8CU` (o el alias: `Cuenta añadida: Cuenta 12`).
- Desde entonces ese tag es conocido: sus próximas exportaciones siguen el flujo normal.

**Dónde aparece la cuenta nueva**
- **Roster**: sección `Otras cuentas` con el número a la derecha (`.section-header` + `.num`), **después de TH11** y antes del enlace «Ajustes y aviso legal». Una fila `.row.row--thumb44` por cuenta, como las TH13/TH11: TH en `.thumb--44`, título = alias o tag (`.tag`), subtítulo `TH16 · sin objetivo · 8 mejoras`, trailing `.bar--mini` **sin marca** (media frente a su TH) + `48,8 %` + chevron.
- **Progreso**: al final del selector de cuenta. **Mejoras**: con su chip corto (`16·8CU`). **Evolución**: sus puntos se guardan, pero ni la tarjeta Objetivo ni la escalera la cuentan hasta que decida el líder.
- **Ajustes → Datos**: fila `.row.row--destructive` `Quitar #QL0Y2P8CU` (o el alias), con alerta `¿Quitar #QL0Y2P8CU?` / `Se borrarán su alias y sus importaciones de este iPhone.` / `Cancelar` · **`Quitar`** (`.is-destructive`). Al quitarla: toast `.toast--ok` `Cuenta quitada` (1.1.1). Las 11 cuentas fijas no se pueden quitar.
- Más antigua: `.msg-warn` `Es más antigua que la última guardada (vie 09/10 18:00).` + footnote `Se añadirá solo al histórico. Roster, Progreso y Mejoras seguirán con la del vie 09/10 18:00.`
  - La `dl.kv` de esa tarjeta compara **desde la exportación antigua hasta el último punto** (p. ej. `Mejoras en curso 6 → 8`), y `Equipamiento` dice las piezas de la antigua (1.1.1).
- Duplicado (misma cuenta y mismo `timestamp`): `.msg-info` `Duplicada: ya hay una exportación de esta cuenta con la misma hora (mié 07/10 21:22). Se descarta.` + footnote `Si has cambiado algo en el juego, vuelve a copiar: cada copia lleva su propia hora.`
- Sin cambios con otro `timestamp`: **no** es duplicado. Se importa y añade punto (§8.4, vista previa, variante «Sin cambios»).
- Ítems sin identificar (no bloquea): `.msg-info` `4 ítems sin identificar: se guardan igual.` (C2 con el manifiesto v1.2; singular `1 ítem sin identificar: se guarda igual.`). Si N es 0, no hay línea.
  - N cuenta solo los ítems que se muestran con **"?"** (desconocidos) **y** quedan fuera del %, con la **misma comprobación que decide el %** (§5.4, «Qué cuenta en el %»: sin tope en `caps_clashrecord.json` para el TH de la cuenta, buscado por ID tras `ALIAS`), nunca con el `estado` del manifiesto. No entran:
    - los ítems conocidos sin clave en caps (Ayuntamiento, Estación de crafteo, Cabaña de B.O.B): tienen nombre, así que no son «sin identificar»;
    - los ayudantes: el aviso cuenta solo los ítems de las secciones que alimentan el %; los ayudantes quedan fuera porque no son categoría de progreso (`SECTIONS` en `js/import.js:7` no incluye `helpers`; `93000003` de C1 no suma);
    - los que tienen tope y llevan barra (p. ej. 107000008, Logger, en C1: `Nv 1 / 5`);
    - los módulos del taller (`categoria === "crafting_module"`, `102000033`–`41`): no tienen nombre, pero `craftedScore` los suma en Defensas. No se añade ninguna línea por los módulos en la vista previa, y no se les inventa nombre.
  - **Mismo número en los dos sitios**: la vista previa y los avisos «Sin identificar» de los detalles de categoría (§7b.1, Defensas incluida) usan la misma función, así que no pueden diferir. La N de la vista previa = suma de los avisos de todas las categorías de esa cuenta + piezas sin identificar de Equipamiento. Con el manifiesto v1.2 y los datos del 07/10: **C1 = 8** (Laboratorio 3 + Equipamiento 5; Defensas sin aviso); C2 y las 9 TH13/TH11 = 4 (Equipamiento; Defensas sin aviso). 1.1.1 da 9 en C1 porque cuenta 107000008.
  - (Decisión de Diseño del 8 oct, tras Clash e Imágenes; ampliada el 8 oct con la regla del tope y el Logger.)
- **ID fuera del manifiesto** (`items[String(id)]` es undefined, típico de una cuenta nueva o de una actualización del juego): se muestra como `sin_identificar`, con `.thumb` «?» y `.badge.badge-id` con su ID, sin nombre inventado, y la vista no se rompe. Si tampoco está en `caps_clashrecord.json`, queda fuera de los porcentajes, igual que los tres sin identificar actuales. Se avisa a Imágenes para buscarlo en el Fan Kit.
- Error al guardar: `.msg-err` `No se pudo guardar en este iPhone. Vuelve a intentarlo.` y botón `Reintentar`. No se usa toast porque taparía el botón del sheet.

**Éxito** (toast `.toast--ok`, 3 s)
- `C2 Secundaria actualizada` · `#GVPU80R80 actualizada` · `Añadida al histórico de C2 Secundaria` · `11 cuentas actualizadas` · `10 cuentas actualizadas · 1 al histórico` (con una: `1 cuenta actualizada · 1 al histórico`) · `2 al histórico` (solo antiguas) · `Cuenta añadida: #QL0Y2P8CU`. Al quitar una cuenta añadida: `Cuenta quitada`.
- En Roster, `.large-sub` pasa a `11 cuentas · última importación vie 09/10 18:00`.

### 8.5 Validación y comparación

**Orden** (se para en el primer bloqueo de cada archivo): leer → `JSON.parse` → estructura (`tag`, `timestamp`, TH) → tag entre las 11 o las añadidas (si no: «cuenta nueva») → duplicado `[tag, timestamp]` (se descarta) → más antigua que la última de ese tag → lista (también si no hay cambios). Los ítems `sin_identificar` solo informan.

**Safari no da posición en los errores de JSON.** JavaScriptCore devuelve `JSON Parse error: Expected '}'` o `Unexpected identifier "https"`, sin «position N» (comprobado con JavaScriptCore vía Bun 1.4.2). El `parseLoose` del PR busca `position` y en el iPhone nunca encontrará nada, así que el texto antiguo «(línea 3, columna 18)» desaparece. Las variantes de la tabla salen de mirar el propio texto: vacío, empieza o no por `{` y si termina en `}`.

**Cambios desde el último punto** (el último punto es la exportación más nueva guardada de ese tag):
- Media: `48,8 % → 48,9 %` y delta `.delta`: `+0,1` en `--green-text` si sube y `−0,3` en `--label-2` si baja. **Nunca rojo**. La `.delta` va en `white-space: nowrap`.
- Si la diferencia es menor de 0,05: `49,0 % · sin cambio` (valor nuevo, ` · ` y `sin cambio` en `.delta` sin modificador), **sin flecha ni valor repetido**. En 1.1.1 salía `49,0 % → 49,0 % sin cambio`, que a 17 px partía línea.
- Mejoras en curso: `antes → ahora` y, en otra fila, `Próxima` con `<fmtFin>` (en una sola fila partía línea a 17 px).
- Lista de niveles: por cada `(sección, data)` se compara la suma de `lvl × cnt`. Si solo cambia una instancia: `Nv 9 → 10`. Si cambian varias: `+3 niveles`. Si aparece una instancia nueva: `Nuevo`. Los muros van en **una sola fila** `Muro` · `+12 niveles`. Cada fila lleva la categoría tras « · ».
- Orden de la lista: el **orden fijo de categorías de §2** (Héroes en 6.º lugar, también en C1) y, dentro de cada una, por nombre. Como mucho 8 filas; si hay más, footer `Y 5 cambios más.`
- Nombres: §5.4 y la nota de cambios (v1.2): `nombre` y, si hay `nombre_pendiente`, `nombre_en`. Nunca `nombre_propuesto` ni `nota_interna`. Un ítem `sin_identificar` sale como `Sin identificar` con `.badge.badge-id`.
- No se calcula ni se muestra ningún máximo nuevo aquí. Los % salen del mismo cálculo que Progreso (`caps_clashrecord.json`).

**Nivel por encima del máximo** (regla 3, matiz del líder): si un nivel importado supera el máximo de `caps_clashrecord.json` para ese TH, el máximo de la tabla se ha quedado viejo. Se distingue así:
- **Nivel real, siempre a la vista**: la lista de cambios dice el nivel real (`Nv 15 → 16`), y la ficha del ítem muestra `Nv 16 / 15` con el chip `.chip.chip--warn` `Máximo desactualizado` junto al nivel.
- **En los porcentajes cuenta como el máximo**: el % de su categoría, la media y la vista previa usan `min(nivel, máximo)`. Nunca pasan del 100 % ni hinchan la media.
- No se corrige ni se inventa el máximo: sigue siendo el de `caps_clashrecord.json` hasta que se actualice esa tabla.
- En la vista previa basta un `.msg-info` `1 nivel supera el máximo conocido: cuenta como máximo.` (plural: `3 niveles superan…`). No bloquea ni pide nada.

### 8.6 Componentes reutilizados

Sheet (§5.13), segmented (§5.9), `.list` + `.row` / `.row--thumb40` / `.row--thumb44` (§5.3), `.thumb` y estados del manifiesto (§5.4), TH desde `imagenes_por_nivel` (§5.4), `.chip--main` / `.chip--second` (§5.7), `.btn--primary` / `.btn--plain` / `.btn--block` (§5.8), `.row--destructive` y alerta destructiva (§5.3, §5.12), `.sk` (§5.11), toast (§5.12), `.preview`, `.kv` y `.json-input` (este apartado), `.section-header` / `.section-footer` (§5.1) y el pie legal (§5.14). **No hay iconos**: los pasos van numerados en texto y los estados se dicen con palabras.

CSS nuevo (los mensajes `.msg-*` adoptan los nombres que ya usa `css/views.css` del PR):

```css
.json-input { display: block; width: 100%; min-height: calc(8 * 18px); padding: 0; border: 0; resize: vertical;
  background: transparent; color: var(--label); font: 400 13px/18px var(--font-mono); letter-spacing: 0; }
.json-input::placeholder { color: var(--label-3); }
.json-input:focus { outline: none; }
.json-input--short { min-height: calc(3 * 18px); }            /* pegado a mano: ya no es el centro del sheet */
.preview { display: grid; grid-template-columns: 96px 1fr; column-gap: var(--sp-3); align-items: center; }
.preview__main { min-width: 0; display: grid; gap: 2px; }
.preview__main .account-card__title { flex-wrap: wrap; row-gap: 2px; }   /* el chip baja de línea con texto grande */
.kv { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-2) var(--sp-3); margin: var(--sp-3) 0 0; padding-top: var(--sp-3); border-top: 0.5px solid var(--separator); }
.kv dt { color: var(--label-2); white-space: nowrap; }
.kv dd { margin: 0; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }

/* Mensajes en línea: el punto es decoración; el significado va en el texto */
.msg { display: flex; align-items: baseline; gap: var(--sp-2); margin: var(--sp-3) 0 0; font-size: 0.882rem; line-height: 1.333; }
.msg > span { min-width: 0; overflow-wrap: anywhere; }       /* todo el texto en UN span: .msg es flex (1.1.1) */
.msg::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--label-3); transform: translateY(-1px); }
.msg-err  { color: var(--red-text); }
.msg-err::before  { background: var(--red); }
.msg-warn { color: var(--orange-text); }
.msg-warn::before { background: var(--orange); }
.msg-info { color: var(--label-2); }
.sheet__actions .msg { margin: 0 0 var(--sp-2); }

.delta { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }   /* el signo nunca se separa de la cifra */
.delta--up   { color: var(--green-text); }
.delta--down { color: var(--label-2); }                      /* nunca rojo */
.nowrap { white-space: nowrap; }                             /* «…».: último carácter + » + . juntos (§8.4) */
.trail-warn { color: var(--orange-text); font-weight: 600; } /* trailing «Más antigua» del lote */
.trail-bad  { color: var(--red-text); font-weight: 600; }    /* «No válido»; desde 1.1.1 esa fila no lleva trailing */
.sheet__actions .btn + .btn { margin-top: var(--sp-1); }

/* Campo de texto en fila (alias de cuenta nueva). 1rem ≥ 16 px: Safari no hace zoom al enfocar */
.row__input { flex: 1; min-width: 0; padding: 0; border: 0; background: none; color: var(--label);
  font: inherit; letter-spacing: inherit; text-align: right; }
.row__input::placeholder { color: var(--label-3); }
.row__input:focus { outline: none; }
.row__input.tag { font-family: var(--font-mono); }

/* Resaltado tras importar (Roster): opaco, se desvanece en 1,2 s */
.card.is-flash, .row.is-flash { background: color-mix(in srgb, var(--tint) 12%, var(--bg-2)); }
@media (prefers-reduced-motion: no-preference) {
  .card.is-flash, .row.is-flash { animation: flash-out 900ms ease-out 300ms forwards; }
  @keyframes flash-out { to { background: var(--bg-2); } }
}

/* Dynamic Type: el sheet es el contenedor; 19em ≈ cuerpo de 21 px o más en 393 px.
   En la app, este bloque va en css/views.css DETRÁS de las reglas base de .preview/.kv (ver nota debajo) */
.sheet__body { container-type: inline-size; }
@container (max-width: 19em) {
  .preview { grid-template-columns: 1fr; row-gap: var(--sp-3); }
  .preview > .thumb { --size: 72px; }
  .kv { grid-template-columns: 1fr; row-gap: 0; }
  .kv dt { white-space: normal; }
  .kv dd { text-align: left; margin-bottom: var(--sp-2); }
}
```

Con `prefers-reduced-motion`, `.is-flash` se queda fijo y lo quita el JS a los 1,2 s.

Notas de implementación (aprendidas en 1.1.1):
- **Texto de `.msg` en un solo `<span>`** (`msgLine(cls, role, html)` en `js/app.js`). `.msg` es flex: cada hijo en línea (texto suelto, `.tag`, `<b>`) sería un elemento flex aparte y «Empieza por «…».» salía en columnas. Con `.msg > span { min-width: 0; overflow-wrap: anywhere }` el texto fluye como un párrafo y una URL larga parte línea sin desbordar.
- **Cada bloque `@container` va en la misma hoja que sus reglas base y detrás de ellas.** Con la misma especificidad, gana la regla que va después en la cascada: en 1.1.1 el bloque de `.preview`/`.kv` estaba en `components.css` y lo anulaban las reglas base de `views.css`, que carga después (orden: `tokens.css`, `base.css`, `components.css`, `views.css`). Ahora va en `views.css`, justo detrás de `.kv dd`.
- `.trail-warn` / `.trail-bad` son las clases de la app para los trailing en color del lote (§8.4).

### 8.7 Llegada desde un Atajo de iOS, sin backend

> **Aplazado (7 oct 2026)**: el Atajo (Flujos B y C y la pantalla «Atajo») espera a que Miguel lo pruebe en su iPhone. En este PR entran el Flujo A (pegar) y «Archivos» sin la lista del Atajo. El análisis se queda aquí para retomarlo.

**Qué permite iOS de verdad:**

| Vía | Estado en Safari de iOS | Uso aquí |
|---|---|---|
| `navigator.clipboard.readText()` tras un toque | **Sí** (desde Safari 13.1). Si el texto viene de otra app, iOS muestra un globo «Pegar» que hay que tocar; tocar en otro sitio rechaza la promesa (blog de WebKit «Async Clipboard API») | Flujo principal: botón **Pegar** |
| Evento `paste` en la textarea (mantener pulsado → Pegar) | **Sí**, y no muestra el globo extra | Valida en el acto, igual que el botón |
| `<input type="file" multiple>` → app Archivos / iCloud Drive | **Sí**. Que con `accept=".json,application/json"` los `.json` no salgan en gris: **sin confirmar** en el iPhone de Miguel (si salen en gris, quitar `accept` y validar dentro) | Lote del Atajo |
| Atajo con «Abrir URL» `https://…/clash-progreso/#/importar` | Abre **Safari**, no la app de la pantalla de inicio, y la app instalada **no comparte almacenamiento con Safari** (WebKit bug 181849, «by design»). Lo importado allí no aparecería en la app | **No usar** (de ahí el aviso «Estás en Safari») |
| `webapp://ardu01.github.io/clash-progreso/` desde «Abrir URL» | Esquema **no documentado**: unos dicen que abre la web app instalada y otros que da «dirección no válida» en iOS 26 | Solo opcional y **sin confirmar**. No contar con que respete `#/importar` |
| JSON dentro de la URL (`#/importar?d=…`) | Posible sin backend porque el fragmento no sale del iPhone, pero abre Safari (almacenamiento aparte) | No |
| Leer el portapapeles al abrir la app, sin toque | **No**: fuera de un gesto, `readText()` se rechaza | No hay auto-pegado |
| Web Share Target, `file_handlers`, Launch Handler | **No soportados** en Safari de iOS (caniuse, 2026): la app no sale en la hoja de compartir | No |
| Menú `shortcuts` del manifiesto (mantener pulsado el icono) | Sin confirmar en iOS | No prometer |

**Flujo A: una cuenta, sin Atajo (el de siempre).** Copiar en el juego → abrir Clash Progreso desde su icono → «Importar» → **Pegar** → globo «Pegar» del sistema → vista previa → **Importar**. Son 5 toques desde que se copia.

**Flujo B: varias cuentas, con el Atajo «Guardar exportación CoC» (recomendado para las 11).**
1. En cada cuenta: Copiar en el juego y lanzar el Atajo con Toque atrás o el Botón de Acción. Sale la notificación «Exportación guardada».
2. Al final: app → «Importar» → `Archivos` → **Elegir archivos…** → iCloud Drive › Atajos › Clash Progreso → seleccionar todos → Abrir → Lote → **Importar 11 cuentas**.
3. Volver a elegir archivos viejos no hace daño: los duplicados se omiten solos y los más antiguos van al histórico.

Acciones del Atajo, en orden (nombres en español **sin confirmar**):
1. `Obtener portapapeles`
2. `Obtener diccionario de` (entrada: Portapapeles)
3. `Obtener valor del diccionario`, clave `tag`. Si no tiene valor: `Mostrar notificación` «No hay una exportación copiada» y `Detener atajo`.
4. `Reemplazar texto`: `#` por nada.
5. `Obtener valor del diccionario`, clave `timestamp`.
6. `Guardar archivo`: carpeta `Clash Progreso`, nombre `<tag>_<timestamp>.json` (el mismo patrón que `historico/exportaciones/`, p. ej. `R00C8CPQC_1791400988.json`) y «Preguntar dónde guardar» desactivado.
7. `Mostrar notificación` «Exportación guardada».

Sin confirmar en el iPhone de Miguel:
- que «Guardar archivo» sin preguntar use iCloud Drive › Atajos;
- que Toque atrás ejecute el Atajo sin sacarlo del juego;
- que iOS pida permiso la primera vez («Atajos quiere pegar desde Clash of Clans»; ajuste «Pegar desde otras apps»).

El Atajo solo comprueba que hay `tag`; la validación de verdad la hace la app.

**Flujo C (opcional, sin confirmar).** Un Atajo «Importar en Clash Progreso»: `Obtener portapapeles` → comprobar `tag` → `Abrir URL` `webapp://ardu01.github.io/clash-progreso/` → en la app, «Importar» → **Pegar**. Si en la prueba se abre Safari, se descarta: el aviso «Estás en Safari» lo delata.

**Distribución del Atajo.** La app no puede instalarlo. Miguel lo crea una vez siguiendo la pantalla «Atajo». Un enlace de iCloud compartido necesitaría su cuenta. Las dos cosas quedan aplazadas (§8.10).

### 8.8 Dynamic Type, safe areas y teclado

- **Dynamic Type**:
  - Todo el texto del sheet va en `rem`. El chrome es fijo, como en iOS: barra del sheet a 17 px y segmented a 13 px.
  - `.sheet__body` es contenedor (`container-type: inline-size`). Con cuerpo de 21 px o más (≤ 19em en 393 px), la miniatura de la vista previa baja a 72 px y se apila encima, y `.kv` pasa a una columna (etiqueta encima y valor a la izquierda). El chip del título baja de línea.
  - Las filas de pasos dejan el texto largo en `.row__sub`, que sí parte línea. El título de fila es corto porque lleva `ellipsis`.
  - Las filas del lote llevan `.row--account` (§5.3): con la `.list` a 19em o menos, el tag o alias no se recorta ni se parte a mitad de palabra y el trailing (`+3 niveles`, `Sin cambios`, `Duplicada`…) baja a su propia línea, alineado con el texto (comprobado a 28 px en 1.1.1).
  - Los mensajes `.msg` fluyen como un párrafo (§8.6) y «Empieza por «…».» no deja la puntuación final sola (§8.4).
  - El subtítulo de las filas `No válido` (`<archivo> · <motivo>`) baja de línea sin cortarse y sin `·` al principio de línea hasta 28 px, también con nombres de archivo largos sin espacios (1.1.3, §8.12).
  - Los botones de 50 px crecen con el texto. Con dos botones en `.sheet__actions`, el cuerpo sigue desplazándose por detrás.
  - Capturas a 23 px y 28 px en `capturas/importar/`.
- **Safe areas**: el sheet empieza en `env(safe-area-inset-top) + 10px` y termina con `padding-bottom: env(safe-area-inset-bottom)`, así que el primario queda por encima del indicador de inicio (34 px). En horizontal, los márgenes usan `--margin-l` / `--margin-r` (§4). El toast de éxito sale ya sobre Roster, por encima de la tab bar.
- **Teclado**: pegar con mantener pulsado dispara la validación y hace `blur()`, así que el teclado se cierra solo. Cómo queda el botón fijo con el teclado abierto mientras se escribe a mano está **sin confirmar** y hay que probarlo en el iPhone. Escribir un JSON a mano es un caso raro.
- **Lectores de pantalla**:
  - Tras validar, el foco va a la tarjeta de vista previa (`tabindex="-1"`) y se anuncia el `role="status"`.
  - Los errores y avisos llevan `role="alert"` y la info `role="status"`.
  - El segmented es un `role="tablist"` y Validando lleva `aria-busy="true"`.
  - Cada fila del lote se lee entera: «C2 Secundaria, TH16, datos del vie 09/10 18:00, más 3 niveles».

### 8.9 Qué cambia respecto al PR #1

1. «Pegar del portapapeles» pasa a ser **Pegar**, el primario, y valida sin pasar por «Revisar». Ahora el `catch {}` es silencioso; pasará a mostrar «No se ha pegado nada».
2. Los archivos elegidos se validan al momento. El primario es «Elegir archivos…» y, después, «Importar N cuentas».
3. Desaparece «(línea N, columna M)», que en Safari nunca sale (§8.5), y entran las variantes de la tabla de errores.
4. Las tarjetas de revisión pasan de `.account-card` + `.row` a `.preview` + `dl.kv`, más la lista de cambios. La textarea `.import-text` pasa a `.json-input.json-input--short`. `.msg-err` / `.msg-warn` / `.dot-err` se unifican en `.msg.msg-*`.
5. Nuevo aviso «Estás en Safari» con `navigator.standalone === false`.
5b. «Importar igualmente» y su alerta desaparecen. Un tag ajeno lleva a «Añadir como cuenta nueva…» y a la pantalla de confirmación. Hace falta guardar las cuentas añadidas (`{tag, alias, añadida}`), la sección «Otras cuentas» en Roster y la fila «Quitar …» en Ajustes.
6. Los toasts y mensajes de éxito y error cambian a los textos de §8.4.
7. `.toast` necesita `width: max-content` (§5.12): con `left: 50%` y sin ancho, «C2 Secundaria actualizada» se parte en dos líneas. Afecta a `css/components.css`. **Entra en el PR de imágenes v1.2** (decisión del 7 oct 2026), igual que el cambio de mensajes de `parseLoose` del punto 3.

### 8.10 Decisiones del líder (cerrado el 7 oct 2026)

1. **Tag ajeno**: no se importa sin más ni se rechaza. Se ofrece «Añadir como cuenta nueva…» con confirmación (pantalla 10b de §8.4); la cuenta va en «Otras cuentas», tras las 11, sin objetivo. «Importar igualmente» desaparece. Una cuenta añadida no entra en el objetivo TH18 + TH17 + 9×TH15 ni recibe objetivo de TH hasta que Miguel lo decida.
2. **Sin cambios**: una exportación nueva sin cambios **sí añade punto** al histórico. Otra con el mismo `timestamp` de la misma cuenta se descarta como duplicada (textos de §8.4).
3. **Atajo**: aplazado hasta que Miguel lo pruebe en su iPhone. La pantalla «Atajo» y §8.7 se conservan marcadas como aplazadas, y la maqueta lo indica.
4. **Entrega**: PR propio después del de imágenes v1.2. Los arreglos de `.toast` (`width: max-content`) y de `parseLoose` (mensajes sin «línea/columna») entran ya en el PR de imágenes v1.2.
5. **Nivel por encima del máximo** (matiz a la regla 3): nivel real en la ficha con el chip «Máximo desactualizado»; en el % de la categoría y en la media cuenta como el máximo, sin pasar del 100 % (§8.5).

Sigue abierto: los nombres en español de los menús del juego (`Ajustes → Más ajustes → Exportar datos → Copiar`), a confirmar con Miguel.

### 8.11 Decisiones del 8 oct 2026 (especificación de 1.1.2)

Tras la revisión de diseño del PR #3 (1.1.1, `528c3d4`) y las de Clash e Imágenes:
1. **«N ítems sin identificar»** (vista previa §8.4 y avisos de los detalles de categoría §7b.1, Defensas incluida) cuenta **solo** los ítems que se muestran con "?" **y** no tienen tope en caps para ese TH tras `ALIAS` (la misma comprobación que decide el %), no con el `estado` del manifiesto; los conocidos sin clave en caps (Ayuntamiento, Estación de crafteo, Cabaña de B.O.B) no entran. Fuera del recuento: los ítems con tope y barra (107000008 en C1) y los `crafting_module` (102000033–41, vía `craftedScore`). Se quita la coletilla «salvo cuando el archivo de máximos les da un tope…»; con N = 0 no hay aviso. 1.1.2 lleva un test: C1 da el mismo número en la vista previa y en la suma de avisos (8), las otras 10 cuentas dan 4, Defensas de C1 sin aviso y 107000008 fuera.
2. **107000008 = Logger** (`Guardian-Logger`): presentación de `id_deducido` como el Duque Dragón y la Inferno Artillery (§7b.1). El % no cambia.
3. **«Validando…» solo tras 150 ms** (temporizador, §5.11 y §8.3), nunca como destello.
4. **Archivos siempre abre el lote**, también con un solo archivo (`1 archivo · 1 listo`); nunca la vista previa suelta con «Pegar otra» (§8.3).
5. **Media sin cambio**: `49,0 % · sin cambio`, sin flecha ni valor repetido; con cambio, `49,0 % → 50,1 %` y la `.delta` en `nowrap` (§8.5).
6. **«Empieza por «…».»**: último carácter, `»` y `.` juntos en `span.nowrap` dentro del único `<span>` de `.msg` (§8.4).

7. **Archivo ilegible en el lote** (decidido por Diseño): la fila «No válido» lleva de subtítulo `<archivo> · <motivo sin punto final>` (p. ej. `c1.json · El archivo está incompleto`), con el mismo `.row--account` de dos líneas y sin texto a la derecha. Los textos de archivo de `parseLoose` se siguen usando ahí.
8. **Muestra recortada con «…»**: si el texto pegado o el archivo tiene más de 20 caracteres, la muestra de «Empieza por» lleva «…» al final (`https://link.cla…`, como en la tabla de §8.4). El grupo `span.nowrap` de la decisión 6 queda como `…».`. Si tiene 20 caracteres o menos, va sin «…». Desde 1.1.3, sin espacios antes de «…» (§8.12).
9. **Singular**: `1 ítem sin identificar: se guarda igual.`

Pendiente de otros:
- **Aviso, sin decisión pendiente.** Mientras el manifiesto tenga 107000008 como `sin_identificar` (v1.2), sale con «?» e `ID 107000008` en el grupo «Sin identificar» de Defensas de C1, pero ya no cuenta en N. El cambio de presentación llega con el set de imágenes que lo pase a `id_deducido`. No hay excepción en el código.

### 8.12 Decisiones 1.1.3 (8 oct 2026)

Tras la revisión de diseño del PR #4 (1.1.2, `c5224d0`). Decide Diseño. Medido en Chrome a 390×844, DPR 2, de 17 a 32 px, claro y oscuro.
1. **Fila «No válido»: solo el primer motivo.** Subtítulo `<archivo> · <primer motivo sin punto final>`. Con estructura incompleta: `foo.json · Falta el tag de la cuenta` (en 1.1.2 iban las tres frases seguidas, hasta 4 líneas a 28 px). La lista completa sigue en la tarjeta de error del flujo Pegar.
2. **Texto que no empieza por `{`: `Empieza por «muestra»`.** Subtítulo `<archivo> · Empieza por «https://link.cla…»`, sin «El archivo no es una exportación» (el título ya dice «No válido»). Medido con 5 nombres de archivo (de 7 a 43 caracteres) y 5 muestras, en 75 casos a 17, 23 y 28 px. Ocupa las mismas líneas que el motivo corto sin muestra (`El archivo no es una exportación`): 1 o 2 a 17 px y de 1 a 3 a 28 px. Solo en 5 casos ocupa una línea más, todos con muestras de 20 caracteres sin espacios a 23 o 28 px. Siempre ocupa una línea menos que el texto entero de 1.1.2, o las mismas; ese texto llegaba a 4 líneas a 28 px. Ninguna muestra deja `»` ni `…»` sola de 17 a 32 px. Se queda la muestra porque dice qué hay en el archivo (un enlace, un mensaje…) y no cuesta líneas. Va en texto normal, sin `.tag`.
3. **`·` pegado al nombre**: espacio sin separación (U+00A0) entre el nombre y el `·`. En 1.1.2, a 28 px y con un nombre largo, el `·` empezaba línea.
4. **Nombre de archivo largo sin espacios**: `.row--account .row__sub { overflow-wrap: break-word; }` (§5.3). En 1.1.2, `exportacion_cuenta_principal_TH17.json` se cortaba a 28 px (`…TH17.jso`, 36 px fuera de la fila). Roster sale idéntico píxel a píxel a 17 y 28 px, claro y oscuro. A 32 px, un nombre de 25 caracteres sin espacios puede llevarse el `·` a la línea siguiente; se acepta (fuera del rango de §10.18).
5. **Muestra sin espacio antes de «…»**: si el texto pasa de 20 caracteres, los 16 primeros se recortan por la derecha (`trimEnd`) antes de añadir `…`: `abcdefghijklmno…`, no `abcdefghijklmno …`. En 1.1.2, a 23 px, el `…»` quedaba solo en otra línea.
6. **Sin footer `No es una exportación válida.`** en «Se omiten» cuando todas las filas no válidas dicen su motivo (hoy, siempre). El footer de `Duplicada` se queda (§8.4).

Pendiente de otros (Imágenes, no bloquea 1.1.3; 1.1.3 lleva el manifiesto v1.3.2, que solo cambia la cabecera):
- **Cajas con alfa > 8 en `build.py`**, para un set posterior con revisión de todas las imágenes. Calculado sobre los PNG de v1.3.2 (iguales a los de v1.3.1) con la fórmula de §5.4 a 40, 44, 52, 72 y 96 px: de 171 imágenes con `caja_visible`, la caja cambia en 96, pero `z` solo cambia en 10; en las demás manda el tope de resolución o la diferencia es mínima. Cambian más de un 5 %: Alquimista (93000002) 1,613 → 1,758 (+9,0 %; el centro se mueve −2,3 % del lado en x), Tiradora (107000000) 1,299 → 1,394 (+7,2 %) y Balón punzante (90000014) 1,266 → 1,331 (+5,1 %). Cerca del límite: Mina de rastreo aéreo (12000006), +4,5 % de 40 a 72 px y centro +5,0 % del lado en x a 96 px. Ninguna empieza ni deja de encuadrarse (`z ≥ 1.15`). El Logger ya usa alfa > 8 desde v1.3.1.

---

## 9. Accesibilidad

- **Contraste AA medido** (texto normal ≥ 4,5:1):
  - `--label-2`: 5,2 sobre blanco y 4,7 sobre #F2F2F7 en claro; 7,7 sobre #1C1C1E en oscuro.
  - `--tint`: 5,6 (blanco) y 5,0 (#F2F2F7) en claro; 6,0 en oscuro.
  - Blanco sobre `--tint-fill`: 5,6 en claro y 5,1 en oscuro.
  - `--green-text` 5,4 · `--orange-text` 5,3 · `--red-text` 5,4 en claro y 6,0 en oscuro.
  - Iniciales de `.thumb--empty` (`--label-2` sobre `--fill-3` + `--bg-2`) ≥ 4,5.
  - **`--label-3` no se usa nunca para texto informativo.**
  - `.badge` neutra (`--fill-3`) solo sobre `--bg-2`. Sobre `--bg` (sheets) da 4,09:1, así que en sheets lleva fondo `--bg-2` (5,2:1).
- **Objetivos táctiles ≥ 44×44 px**: filas (mínimo 44; cuentas 64), celdas de equipamiento (52), pestañas, `.btn-text`, segmented (área ampliada con `::after`) y botones de 50 px. Al menos 6 px entre objetivos.
- **Nada solo por color**: cada barra lleva `%` en texto. Cada barra suelta lleva aria-label; dentro de una fila la barra es aria-hidden y la fila lleva el aria-label completo. "Máx", "Terminada", "Nuevo", "sin identificar" e "ID deducido" van siempre en palabra. Los puntos de categoría siempre llevan el nombre al lado.
- **Dynamic Type**: escala en `rem` sobre `-apple-system-body`. El layout aguanta hasta ~23 px de body (primer tamaño de accesibilidad) con contenedores (`@container`, nunca `@media` en `em`, que en Safari no sigue a `-apple-system-body`). `.list` (§5.3) y `.chart-wrap` (§7d) se reordenan a partir de 19 px aprox. Los títulos de fila pueden llevar `ellipsis` a tamaño normal; a partir de 19 px aprox. (`.list` ≤ 19em) **ningún título de fila se recorta**: baja de línea con `overflow-wrap: break-word`, y las insignias «ID deducido» y de ID bajan enteras (§5.3). **El tag de cuenta del Roster no se recorta nunca**. El trailing de Roster y Mejoras baja a su propia línea (el `flex: none` de `.row__trail--stack` solo vale a tamaño normal), el select del gráfico pasa debajo del título y las tarjetas no tienen alturas fijas. A 28 px no se recorta nada en Roster, Progreso, detalles de categoría, Mejoras («Por fin», «Por cuenta» y Ayudantes), Evolución, Muros ni Ajustes: el chip «Secundaria» de C2 baja bajo el nombre (§7a) y la etiqueta de `.slots` ocupa su propia línea con los puntos y el recuento debajo (§7c). El chrome (tab bar a 10 px, nav compacta a 17 px, segmented a 13 px y badge de nivel a 11 px) es fijo, como en iOS.
- **`prefers-reduced-motion`**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important; scroll-behavior: auto !important;
    }
  }
  ```
- **Lectores de pantalla**:
  - Tab bar con `aria-current="page"`. El título compacto lleva `aria-hidden` para no duplicar el grande.
  - Cada fila es un único `<a>`/`<button>` con un texto completo, sin repeticiones:
    - en el Roster, "C2 Secundaria, TH16, objetivo TH17, media 48,8 %";
    - en el detalle, "Príncipe Esbirro, nivel 31 de 95" (+ ", ID deducido");
    - en la rejilla de equipamiento, "<nombre>, nivel N de M" (+ ", ID deducido"); si el nivel supera el máximo, "nivel N, máximo desactualizado";
    - en Categorías, "Defensas, 70,1 %, TH17 64,0 %, faltan 190 niveles".
    La barra de dentro de una fila es decorativa (`aria-hidden="true"`); las barras sueltas siguen con `role="img"` y `aria-label`. Las tablas `.sr-only` usan fechas legibles (`07/10`), nunca ISO. El `input[type=file]` oculto lleva `tabindex="-1"` y `aria-hidden`.
  - Gráficos y escalera con `role="img"` y tabla `.sr-only`.
  - Toast con `role="status"` y errores de importación con `role="alert"`.
  - El progreso de descarga se anuncia por `#announcer` (`aria-live="polite"`, fuera de `#app`): 25, 50 y 75 % y el estado final (§7e).
  - Las alertas llevan `role="alertdialog"`, `aria-labelledby` (título) y `aria-describedby` (mensaje), con el foco de §5.12.
- **Foco visible** (teclado externo o iPad): `:focus-visible { outline: 3px solid var(--tint); outline-offset: 2px; }`.

---

## 10. Checklist para revisar un PR contra el sistema

1. [ ] `tokens.css` coincide con §2 en claro y en oscuro. No hay hex sueltos en los componentes.
2. [ ] Ningún texto informativo en `--label-3`. Los colores de texto usan las variantes `-text` o `--tint`.
3. [ ] Tipografía en `rem` sobre `-apple-system-body`. `tabular-nums` en %, niveles, horas y contadores.
4. [ ] `viewport-fit=cover`, `black-translucent`, los dos `theme-color` y `format-detection`. Paddings con `env(safe-area-inset-*)`. Tab bar de 49 + safe area.
5. [ ] Cuatro pestañas (Roster · Progreso · Mejoras · Evolución) con material y fallback sólido. Ajustes como botón en la nav de Roster que abre un sheet. Large Title que colapsa.
6. [ ] Imágenes desde `manifest.items[String(id)]`. El TH sale de `imagenes_por_nivel[lvl]`. `.thumb` con `object-fit: contain` y PNG sin editar. `width`/`height` fijos, `loading="lazy"` y `decoding="async"`.
7. [ ] Los cuatro estados del manifiesto con su estilo: `ok` imagen, `id_deducido` imagen + badge "ID deducido", `faltante` iniciales, `sin_identificar` "?" + badge de ID, más `.thumb--offline` rayado. Estado leído siempre del manifiesto (y nunca usado para decidir el %, §5.4); 107000008 como Logger `id_deducido` (`nombre_en`, «ID deducido», «Nombre en español sin confirmar», «Sin imagen» si no hay imagen) en cuanto el manifiesto lo marque así; `pesado: true` sin imagen en listas (v1.1). Nada de `assets/wiki/`, emojis ni iconos genéricos.
8. [ ] **Equipamiento: el nº de piezas mostradas = `equipment.length` de la exportación** en cada cuenta (hoy C1 43 · C2 39 · #GUQUV98JG 38 · #GVG9GCYUV 38 · #R02YVYLJ8 38 · #GJPJP9JP0 35 · #GVPU80R80 33 · #GVUQ2C2VC 35 · #GVVYVU802 33 · #GVPU2CJR8 33 · #R02YUVC0J 33). El contador "N piezas" coincide, las sin identificar salen con etiqueta y nivel al final de su grupo y no hay deduplicado ni filtro por nivel 1.
9. [ ] Barras con doble referencia (relleno, marca del TH actual y final del TH siguiente), % en texto y verde solo al máximo. **Nunca rojo por progreso bajo.**
10. [ ] Categorías en el orden fijo de §2. Héroes en 6.º lugar y sin destacar como cuello de botella (sobre todo en C1).
11. [ ] Roster: C1 y C2 en tarjeta con chip Principal/Secundaria. TH13 y TH11 en listas con el orden fijo. Cuentas sin importar visibles. Objetivo por cuenta (18/17/15).
12. [ ] Muros: barra apilada por nivel + chips + nivel medio, con datos del CSV o de la exportación.
13. [ ] Mejoras: fin = `timestamp + timer` en Europe/Madrid, `Nuevo` para `lvl 0`, `Terminada · pendiente de reimportar` si ya pasó, orden por fin y libres solo con total conocido.
14. [ ] Evolución: objetivo TH18 + TH17 + 9×TH15, subidas pendientes (hoy 29), escalera de TH, gráficos SVG con tokens y estado de snapshot único.
15. [ ] Importación (§8): **Pegar** valida en el acto y Archivos admite varios. Vista previa con cuenta (tag), TH, fecha en hora de Madrid y cambios desde el último punto, en el orden de §2. Casos JSON no válido / tag ajeno («Añadir como cuenta nueva…», sin «Importar igualmente») / más antigua / duplicado (mismo `timestamp`) con los textos de §8.4. Sin cambios = punto nuevo. Cuentas añadidas tras las 11 y sin objetivo. Nivel por encima del máximo: real en la ficha con «Máximo desactualizado» y topado en los %. Aviso «Estás en Safari». Nada de «línea/columna», nada de rojo por bajar la media, y el Atajo sigue aplazado. Desde 1.1.2:
    - «Validando…» solo si la validación pasa de 150 ms (se comprueba con CPU normal, donde no debe verse, y ralentizada ×20, donde sí), sin destello;
    - Archivos con **1 archivo** abre el lote `1 archivo · 1 listo` y no hay «Pegar otra» en el flujo Archivos;
    - Media `49,0 % · sin cambio` en una línea a 17 px; con cambio, la `.delta` nunca se parte;
    - «Empieza por «…».» sin `.`, `»` ni `».` solos de 17 a 28 px;
    - «N ítems sin identificar» con la misma comprobación que el %: hay un test en `test/` que da C1 = 8 en la vista previa y en la suma de avisos, 4 en las otras 10 cuentas, Defensas de C1 sin aviso y 107000008 fuera; solo cuentan los «?» sin tope, no los conocidos sin clave en caps; ningún aviso dice «salvo cuando…»;
    - textos de `.msg` en un solo `<span>`, fila «No válido» sin trailing y toasts de §8.4 (incluido `Cuenta quitada`).
    Desde 1.1.3:
    - fila «No válido» con `<archivo> · <primer motivo>` (o `Empieza por «muestra»`), sin punto final y con el `·` pegado al nombre; «Se omiten» sin el footer `No es una exportación válida.`;
    - muestra de más de 20 caracteres sin espacio antes de «…».
16. [ ] Ajustes: descarga de imágenes con sus 6 estados, progreso en bytes reales y "~40 MB". Al instalar solo se precachean la app, los datos, el manifiesto, los TH y los héroes.
17. [ ] Aviso de la Fan Content Policy **literal en inglés** al pie de cada vista y sheet (Caption 1, `--label-2`), con la versión completa en Ajustes → Acerca de.
18. [ ] Dynamic Type a 23 px (`html { font-size: 23px }` inyectado): ningún tag de cuenta recortado en Roster; ningún título de fila con «…» (detalle de categoría, Héroes, Mascotas, Laboratorio, Categorías, Ajustes) y «ID deducido» y los ID de «Sin identificar» enteros; restante y hora de Mejoras bajo el título; select de Evolución bajo «Progreso medio» y sin cortar; sin desborde horizontal. En Importar a 28 px: vista previa y `.kv` en una columna (el `@container` va detrás de las reglas base, §8.6), filas del lote con el trailing en su propia línea y sin palabras partidas; un nombre de archivo largo sin espacios en una fila «No válido» baja de línea sin cortarse. A 17 px, nada se mueve respecto a la versión anterior salvo lo que se arregla.
19. [ ] `prefers-reduced-motion`, objetivos de 44 px. Cada barra suelta lleva aria-label; dentro de una fila la barra es aria-hidden y la fila lleva el aria-label completo. Celdas y gráficos con etiqueta. Rutas relativas (GitHub Pages bajo `/clash-progreso/`) y ninguna petición a terceros.
20. [ ] Separadores de 0,5 px en todas las listas, también con `li > .row` (`li + li > .row::before`, §5.3), con la sangría de `--row-inset`; ninguno encima de la primera fila.
21. [ ] A 17 px, en 375 y 390 px, ninguna fila recorta «ID deducido», el ID ni `×N` (C1 Equipamiento: Corazón ardiente, Colmillos eléctricos; Defensas: Torre de arqueras múltiple ×3; Trampas en SE: Trampa de esqueletos ×4).
22. [ ] Fecha y hora nunca en dos líneas (selector de Progreso a 17 px; Roster a 23 px; Mejoras › Por cuenta a 28 px). `MB` y «N de M» tampoco.
23. [ ] Sheets con teclado: el foco entra al abrir, Tab no sale al fondo, Esc cierra y el foco vuelve al que lo abrió.
24. [ ] Nombres accesibles sin duplicar (filas de detalle y de Categorías). El `.badge-id` de la Ficha pasa de 4,5:1 en claro. El select de Evolución mide ≥ 44 px de alto.
25. [ ] Alertas (Borrar todos los datos, Restaurar datos incluidos, Quitar …, Borrar imágenes guardadas):
    - nombre y descripción accesibles;
    - al abrir, el foco va a Cancelar;
    - Tab y Mayús+Tab no salen de la alerta y el sheet de detrás está `inert`;
    - Esc cancela sin cerrar el sheet;
    - al cerrar, el foco vuelve al control que la abrió (o a su equivalente o al que ocupa su sitio).
26. [ ] «Descargar todas»:
    - mientras descarga, el `.sheet` no se sustituye ni se reanima (0 `animationstart` de `sheet-in`) y conserva el scroll;
    - el foco sigue en «Detener», que se ve entero en SE a 28 px;
    - VoiceOver solo oye 25/50/75 % y el estado final.
    En Importar, cambiar de modo o de paso no vuelve a subir el sheet.
27. [ ] Celdas de equipamiento: «nivel N de M»; si el nivel supera el máximo, «nivel N, máximo desactualizado»; las `id_deducido` llevan «, ID deducido» al final, como las filas.

---

## Nota de cambios (7 oct 2026, tras la maqueta estática)

Revisado con `maqueta/` (datos reales del 07/10, imágenes v1 congeladas, capturas 393×852 a DPR 3 en claro y oscuro). Llaves equilibradas y ningún token sin definir. Cambios:

- **CSS que faltaba o fallaba**: `a.btn`/`a.btn-text` salían subrayados (`text-decoration: none`). `button.row` heredaba el aspecto de botón nativo (reset + `.row.row--destructive`). Mejoras desbordaba: `.row__trail--stack` (dos líneas, restante en `--label`) y `.chip--sm`, que antes solo estaba en prosa. `.slots`: los puntos se encogían a 0 y "Revisar constructores" se salía de la tarjeta (`flex: none`, `flex-wrap`). El `.chart-callout` no tenía ancla (`.chart-wrap`). Añadidas las clases que el texto pedía sin CSS: `.card__top`, `.summary`, `.bar--legend`, `.chart-select`, `.json-input`, `.preview`, `.kv` y `.eq__cap--soft`.
- **Rejilla de equipamiento**: con un hueco de 6 px solo cabían 5 columnas en 393 px (6×52 + 5×6 = 342 > 337). Ahora el hueco es de 4 px y caben 6.
- **Contraste**: `.chip--warn` y el badge `.eq.is-max` tienen ahora fondo opaco. El primero no llegaba a AA sobre `--bg` (4,2:1) y el segundo queda encima de la miniatura.
- **Estados**: el estado se lee siempre del manifiesto. `id_deducido` queda generalizado (v1: 1, v1.1: 4). En listas, `sin_identificar` lleva solo `.badge.badge-id`, porque el badge duplicado desbordaba el título. Nuevas reglas: v1.1 `pesado: true` (solo texto en listas, imagen en la ficha), `imagen: null` = faltante, resolución `imagenes_por_nivel` → `imagen`, y la aldea del constructor (v1.2) en una sección propia.
- **Datos**: los máximos salen solo de `caps_clashrecord.json`. El ejemplo de héroe pasa a `Nv 61 / 110` (antes 75, que es el máximo de TH13). En Ajustes, "14 de 130" en vez de "46 de 130", y los bytes ya vienen del manifiesto.

## Nota de cambios (7 oct 2026, revisión del PR #1)

- `.row__main` pasa a `display: flex; flex-direction: column`. Sin eso, si el título y el subtítulo son `<span>`, salen pegados en la misma línea (`#GUQUV98JGTH13`).
- Mejoras de B.O.B (`extra: true`): van en la lista con las del constructor, pero el subtítulo dice `B.O.B` en lugar de `Constructor`. No añaden punto a `.slots` ni restan libres. El aviso `Revisar constructores` es un recuento y nunca señala una mejora concreta.
- Los constructores ocupan con timer en `buildings`, `traps`, `heroes` y `guardians`, sin `extra`. Las mejoras de los edificios Laboratorio (1000007) y Casa de mascotas (1000068) cuentan como constructor (decisión de Clash y del líder).
- Nombres (v1.2): se muestra `nombre`. Si el ítem tiene `nombre_pendiente`, se muestra `nombre_en` sin badge en listas, y en la ficha va una footnote c-2 `Nombre en español sin confirmar`. `nombre_propuesto` y `nota_interna` no se muestran nunca.

## Nota de cambios (7 oct 2026, importar exportaciones)

- §8 reescrito como «Importar exportaciones». Incluye estados (vacío, Safari, archivos, Atajo, validando, vista previa con cambios, lote, éxito y los errores JSON no válido, tag ajeno, más antigua y duplicado), textos exactos, CSS nuevo (`.json-input--short`, `.msg-*`, `.delta`, `.is-flash` y contenedor de Dynamic Type en `.sheet__body`) y la llegada desde un Atajo sin backend (portapapeles + Archivos; `webapp://` sin confirmar). Maqueta en `maqueta/importar.html` y capturas en `capturas/importar/`.
- 7 oct 2026, decisiones del líder sobre §8.10:
  - un tag ajeno pasa a «Añadir como cuenta nueva…», con confirmación y sección «Otras cuentas» en Roster, y desaparece «Importar igualmente»;
  - sin cambios añade punto y el mismo `timestamp` se descarta como duplicado;
  - el Atajo queda aplazado;
  - PR propio tras el de imágenes v1.2, al que pasan los arreglos de `.toast` y `parseLoose`;
  - un nivel por encima del máximo se muestra real en la ficha y cuenta como máximo en los %;
  - CSS nuevo `.row__input`.
- 8 oct 2026: regla de presentación para ítems que solo están en `caps_clashrecord.json` (Inferno Artillery), en §7 «Detalle de categoría».

## Nota de cambios (8 oct 2026, 1.1.1 publicada y especificación de 1.1.2)

- **Texto único con el repo.** Este archivo y `docs/sistema.md` de `528c3d4` (1.1.1) solo diferían en dos puntos y quedan unificados: el aviso «Sin identificar» de §7b.1 (la regla de 1.1.1 solo vivía en el repo) y el recuento de §8.4 (la nota de Diseño del 8 oct solo vivía aquí). Desde ahora `docs/sistema.md` del repo es una copia literal de este archivo.
- **Lo que 1.1.1 hizo y no estaba escrito:** separadores también en listas de `<li>` (`li + li > .row::before`, §5.3); `.msg > span` y texto de `.msg` en un solo `<span>` (`msgLine()`); el `@container` de `.preview`/`.kv` en `views.css` detrás de sus reglas base (§8.6); `.delta` en `nowrap`; `.trail-warn` / `.trail-bad`; filas del lote con `.row--account` y el trailing en su propia línea a ≤ 19em (§5.3, §8.8); fila «No válido» sin trailing; título, tag y fecha de la vista previa en `div`; «Cambios» en su propia `.section` y sin sección si solo cambia el TH; textos de error de archivo y `El texto no es una exportación válida.` (§8.4); toasts `Cuenta quitada`, `1 cuenta actualizada · 1 al histórico` y `N al histórico`; en «Más antigua», la `dl.kv` compara desde la exportación antigua hasta el último punto.
- **Especificación de 1.1.2** (§8.11): «N ítems sin identificar» solo «?» y sin tope en caps tras `ALIAS` (no el `estado`), mismo número en vista previa y avisos, sin la coletilla «salvo cuando…» y sin aviso con N = 0 (§5.4, §7b.1, §8.4); 107000008 = Logger con presentación `id_deducido` (§7b.1); «Validando…» solo tras 150 ms con temporizador (§5.11, §8.3); Archivos siempre al lote, también con 1 archivo (§8.3); Media `49,0 % · sin cambio` (§8.4, §8.5); «».» pegado con `span.nowrap` (§8.4, §8.6). Checklist §10.7, §10.15, §10.18 y §10.20 al día.

## Nota de cambios (8 oct 2026, revisión de Pages)

- Revisión de Pages 1.1.0 (main 41f6807), con el CSS probado inyectado a 390×844 y a 17, 19, 23 y 28 px, claro y oscuro; parche y capturas antes/después en `/workspace/pages-v11-caps/fix/` (`parche-titulos.css`). Con la `.list` a 19em o menos, todos los títulos de fila bajan de línea con `overflow-wrap: break-word` y las insignias «ID deducido» y de ID bajan enteras; antes se cortaban hasta 26 títulos por vista a 28 px y desaparecían la insignia del Duque Dragón (desde 19 px) y los ID de los «Sin identificar» (§5.3, §9, §10.18). `.account-card__title` con `flex-wrap: wrap`: el chip «Secundaria» baja bajo el nombre (§7a). `.slots` con contenedor en la columna de la tarjeta: a 12em o menos la etiqueta ocupa su línea y los puntos y el recuento bajan (§7c). A 17 px, captura idéntica píxel a píxel en las 15 vistas probadas.

- Revisión de la v1 publicada (main b1455da), con el CSS probado inyectado sobre https://ardu01.github.io/clash-progreso/ a 390×844 y a 17, 19, 21, 23 y 28 px; parche y capturas antes/después en `/workspace/pages-v1-caps/fix/`. Cambios: margen de 16 px bajo la nav en pantallas push (§5.1); `.list` como contenedor con `.row--account` (el tag del Roster no se recorta y el trailing baja de línea) y `.row--upgrade` (el `flex: none` de `.row__trail--stack` queda solo para tamaño normal; restante y hora bajan bajo el título, también en Ayudantes, que adoptan la fila de mejora) (§5.3, §7a, §7c); detalle de Muros con tarjeta `.walls` + chips y lista «Por nivel» (`.wall-row`, `.wall-swatch`) a partir de `buildings` 1000010 y del máximo de `caps_clashrecord.json` (§5.6, §7b); cabecera del gráfico `.card__top--chart`, `.chart-select` con `max-width: 55%` y ellipsis, salto bajo el título con `@container` y opción «Media del roster» (§7d); §9 y checklist §10.18.
- Revisión de diseño del PR #2 (99c42ef): `.thumb` lleva `grid-template: 100% / 100%` (§5.4) porque la fila automática crecía con las imágenes verticales y las cortaba 5–13 px por abajo; probado con `.thumb--encuadre`. Ninguna fila muestra «null». El máximo de cada fila se busca por ID en `caps_clashrecord.json`, nunca por el nombre en español. Si el TH de la cuenta tiene máximo y el nivel es 0, la fila va en «Sin desbloquear» con `Nv 0 / máx` (p. ej. Luchadora real en TH13, `Nv 0 / 25`). Solo si caps no tiene máximo en ese TH: fila con «Disponible en THn» (n = primer TH con máximo en caps) sin barra, y resumen de categoría «Se desbloquea en THn» sin % (Mascotas en TH11 y TH13, «Disponible en TH14»). La búsqueda va ID → `items[id].nombre_en` → `caps[TH][clave]`. En equipamiento la clave es `nombre_en (héroe)`; hay dos alias, Laboratory → `Lab` y Builder's Hut → `Builder Hut`. Los ítems que no tienen ninguna clave en caps se muestran en la lista que ya les toca con `Nv N` solo, sin barra, sin «/ máx», sin «Disponible» y fuera del %. Son Ayuntamiento, Crafting Station, B.O.B's Hut y la aldea del constructor; los ayudantes siguen en Por fin. Longshot y Smasher sí tienen clave en caps (`Guardian-Long Shot` y `Guardian-Smasher`, máximo 5 en TH18), así que llevan `Nv N / 5` con barra; hacen falta esos dos alias. La ficha de un ítem «Disponible en THn» repite «Disponible en THn», nunca «Nv 0».

## Nota de cambios (8 oct 2026, 1.1.2 publicada y especificación de 1.1.3)

- 1.1.2 está en main (`c5224d0`) con el arreglo de «Validando…» durante el globo «Pegar» de iOS; `docs/sistema.md` de `c5224d0` es la base de este cambio.
- **Especificación de 1.1.3** (§8.12): fila «No válido» con solo el primer motivo y `Empieza por «muestra»` en lugar del texto entero, con el `·` pegado al nombre (§8.4); subtítulo de `.row--account` con `overflow-wrap: break-word` para nombres de archivo largos (§5.3, §8.8); `trimEnd` antes de «…» en la muestra (§8.4, §8.11.8); «Se omiten» sin el footer `No es una exportación válida.` (§8.4). Se quitan de §8.4 los restos de «subtítulo = nombre del archivo» y el «punto abierto en §8.11», ya resueltos en 1.1.2. Checklist §10.15 y §10.18 al día.
- Para Imágenes: la lista de miniaturas cuyo `z` cambiaría más de un 5 % con cajas de alfa > 8 (§8.12). 1.1.3 lleva el manifiesto v1.3.2 (solo cambia la cabecera; mismos PNG, `cp-img-v4` igual).

## Nota de cambios (8 oct 2026, auditoría de 1.1.3 y especificación de 1.1.4)

8 oct 2026, auditoría de 1.1.3 (`1b898df`) y especificación de 1.1.4: título de fila con meta (§5.3), foco en sheets (§5.13), resumen apilado a 28 px (§7b), objetivo del select (§7d), NBSP en fechas y tamaños, `.btn` con padding vertical, contraste de `.badge` en sheets y nombres accesibles de filas (§9), y checklist 21–24 (§10). El manifiesto de imágenes es v1.4.1 (solo cajas y cabecera; `cp-img-v4` igual).

## Nota de cambios (8 oct 2026, 1.1.4 publicada y especificación de 1.1.5)

1.1.4 está en main (`325ca27`). `docs/sistema.md` de `325ca27` es la base de este cambio.

Especificación de 1.1.5:
- **Sheet al redibujar** (§5.13): no se repite `sheet-in`, se conserva el scroll de `.sheet__body` en la misma vista y el control con foco se ve entero.
- **«Descargar todas»** (§7e): actualización parcial de la tarjeta sin `render()`, con anuncios por `#announcer` al 25, 50 y 75 % y al final. Así se cumple el «se anuncia cada 25 %» que ya pedía §7e y que el `aria-live` sustituido en cada `render()` no daba.
- **Alertas** (§5.12): `alertdialog` con nombre y descripción, foco a Cancelar, fondo `inert`, Tab en ciclo, Esc = Cancelar y foco de vuelta al control que la abrió. Se añade la alerta «Restaurar datos incluidos», que ya existía en el código.
- **Celdas de equipamiento** (§7b.2, §9): «nivel N de M»; si el nivel supera el máximo, «nivel N, máximo desactualizado» (el mismo aviso que el chip de la ficha); «ID deducido» al final. Sin máximo, «nivel N».
- **Alertas y Dynamic Type** (§5.12): letra en `rem` y ancho `min(270 px a 17 px, 100vw − 2 márgenes)`.
- Checklist §10.25–27.
